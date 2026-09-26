import { mediaInputSchema } from "@/domain/awareness";
import { RepositoryError } from "@/services";
import { sanitizeDisplayFileName } from "@/services/media";
import { requireLearningAdmin, type LearningClient } from "./authorization";
import { learningDatabaseError } from "./errors";
import { assetRecord as awarenessAssetRecord } from "../awareness/mapping";
import type { AssetRow } from "../awareness/types";
function assetRecord(asset: Omit<AssetRow, "resource_id">) {
  return {
    ...awarenessAssetRecord({ ...asset, resource_id: null }),
    storageKey: `learning-media/${asset.path}`,
  };
}
import { inspectImage, inspectVideo } from "../awareness/inspect-media";
export const BUCKET = "learning-media";

export async function prepareMedia(client: LearningClient, input: unknown) {
  const user = await requireLearningAdmin(client);
  const meta = mediaInputSchema.parse(input);
  const id = crypto.randomUUID();
  const path = `${user}/${crypto.randomUUID()}.${meta.fileName.split(".").pop()!.toLowerCase()}`;
  const { error } = await client.from("learning_media_assets").insert({
    id,
    path,
    role: meta.mimeType.startsWith("image/") ? "image" : "video",
    file_name: sanitizeDisplayFileName(meta.fileName),
    mime_type: meta.mimeType,
    size_bytes: meta.sizeBytes,
    width: meta.width,
    height: meta.height,
    duration_seconds: meta.durationSeconds ?? null,
    alt_text: meta.altText,
    uploaded_by: user,
  });
  learningDatabaseError(error);
  const { data, error: uploadError } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (uploadError || !data) {
    await retireMedia(client, id);
    throw new RepositoryError("server", "The upload could not be prepared. Try again.");
  }
  return { id, signedUrl: data.signedUrl };
}

export async function finishMedia(client: LearningClient, id: string) {
  await requireLearningAdmin(client);
  const { data: asset, error } = await client
    .from("learning_media_assets")
    .select("*")
    .eq("id", id)
    .eq("state", "pending")
    .single();
  learningDatabaseError(error);
  if (!asset) throw new RepositoryError("not-found", "Upload not found.");
  try {
    const { data: info, error: infoError } = await client.storage.from(BUCKET).info(asset.path);
    if (
      infoError ||
      !info ||
      Number(info.size) !== asset.size_bytes ||
      info.contentType !== asset.mime_type
    )
      throw new RepositoryError("validation", "The uploaded file size or type does not match.");
    const { data, error: urlError } = await client.storage
      .from(BUCKET)
      .createSignedUrl(asset.path, 60);
    if (urlError || !data)
      throw new RepositoryError("server", "The upload could not be inspected.");
    const readRange = async (range: string) => {
      const response = await fetch(data.signedUrl, { headers: { Range: range } });
      // Never buffer a 100 MiB video when a storage proxy ignores Range.
      if (!response.ok || (response.status !== 206 && asset.size_bytes > 2 * 1024 * 1024)) {
        await response.body?.cancel();
        throw new RepositoryError("validation", "Media inspection is unavailable. Try again.");
      }
      return new Uint8Array(await response.arrayBuffer());
    };
    const head = await readRange("bytes=0-1048575");
    const dimensions =
      asset.role === "image"
        ? inspectImage(head, asset.mime_type)
        : inspectVideo(head, await readRange("bytes=-1048576"), asset.mime_type);
    const verified = mediaInputSchema.parse({
      fileName: asset.file_name,
      mimeType: asset.mime_type,
      sizeBytes: asset.size_bytes,
      altText: asset.alt_text,
      ...dimensions,
    });
    if (
      verified.width !== asset.width ||
      verified.height !== asset.height ||
      (verified.durationSeconds &&
        Math.abs(verified.durationSeconds - (asset.duration_seconds ?? 0)) > 1)
    )
      throw new RepositoryError(
        "validation",
        "The media dimensions or duration do not match the file.",
      );
    const { data: ready, error: readyError } = await client
      .from("learning_media_assets")
      .update({ state: "ready", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("state", "pending")
      .select()
      .single();
    learningDatabaseError(readyError);
    return assetRecord(ready!);
  } catch (error) {
    await retireMedia(client, id);
    throw error;
  }
}

export async function mediaUrl(client: LearningClient, id: string, download = false) {
  // SELECT policies independently authorize the parent publication state or Super Admin.
  const { data: asset, error } = await client
    .from("learning_media_assets")
    .select("*")
    .eq("id", id)
    .in("state", ["ready", "active"])
    .maybeSingle();
  learningDatabaseError(error);
  if (!asset) throw new RepositoryError("not-found", "This media is no longer available.");
  const { data, error: storageError } = await client.storage
    .from(BUCKET)
    .createSignedUrl(
      asset.path,
      asset.role === "video" ? Math.min(14700, Math.ceil(asset.duration_seconds ?? 0) + 300) : 60,
      download ? { download: asset.file_name } : {},
    );
  if (storageError || !data)
    throw new RepositoryError("server", "The media could not be loaded. Try again.");
  return data.signedUrl;
}

export async function retireMedia(client: LearningClient, id: string) {
  await requireLearningAdmin(client);
  const { error } = await client.rpc("retire_learning_media", { target: id });
  learningDatabaseError(error);
  await cleanupMedia(client);
}

export async function cleanupMedia(client: LearningClient) {
  try {
    // Retired rows are a durable retry queue; do not delete metadata before storage deletion succeeds.
    const { data, error } = await client
      .from("learning_media_assets")
      .select("id,path,created_at")
      .eq("state", "retired")
      .limit(100);
    if (error) {
      console.warn("Learning media cleanup deferred (metadata unavailable).");
      return;
    }
    for (const asset of data ?? []) {
      const { error: storageError } = await client.storage.from(BUCKET).remove([asset.path]);
      if (storageError) {
        console.warn("Learning media cleanup deferred.", { assetId: asset.id });
        continue;
      }
      // Signed upload tokens last two hours. Keep the tombstone beyond expiry so a replay
      // after cancellation is still discoverable by the scheduled cleanup job.
      if (Date.parse(asset.created_at) > Date.now() - 125 * 60 * 1000) continue;
      const { error: deleteError } = await client
        .from("learning_media_assets")
        .delete()
        .eq("id", asset.id)
        .eq("state", "retired");
      if (deleteError)
        console.warn("Learning media metadata cleanup deferred.", { assetId: asset.id });
    }
  } catch {
    console.warn("Learning media cleanup deferred (storage unavailable).");
  }
}
