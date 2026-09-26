import { mediaInputSchema } from "@/domain/awareness";
import { RepositoryError } from "@/services";
import { sanitizeDisplayFileName } from "@/services/media";
import { requireAwarenessAdmin, type AwarenessClient } from "./authorization";
import { databaseError } from "./errors";
import { assetRecord } from "./mapping";
import { inspectImage, inspectVideo } from "./inspect-media";
export const BUCKET = "awareness-media";

export async function prepareMedia(client: AwarenessClient, input: unknown) {
  const user = await requireAwarenessAdmin(client);
  const meta = mediaInputSchema.parse(input);
  const id = crypto.randomUUID();
  const path = `${user}/${crypto.randomUUID()}.${meta.fileName.split(".").pop()!.toLowerCase()}`;
  const { error } = await client
    .from("awareness_media_assets")
    .insert({
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
  databaseError(error);
  const { data, error: uploadError } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (uploadError || !data) {
    await retireMedia(client, id);
    throw new RepositoryError("server", "The upload could not be prepared. Try again.");
  }
  return { id, signedUrl: data.signedUrl };
}

export async function finishMedia(client: AwarenessClient, id: string) {
  await requireAwarenessAdmin(client);
  const { data: asset, error } = await client
    .from("awareness_media_assets")
    .select("*")
    .eq("id", id)
    .eq("state", "pending")
    .single();
  databaseError(error);
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
      .from("awareness_media_assets")
      .update({ state: "ready", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("state", "pending")
      .select()
      .single();
    databaseError(readyError);
    return assetRecord(ready!);
  } catch (error) {
    await retireMedia(client, id);
    throw error;
  }
}

export async function mediaUrl(client: AwarenessClient, id: string, download = false) {
  // SELECT policies independently authorize the parent publication state or Super Admin.
  const { data: asset, error } = await client
    .from("awareness_media_assets")
    .select("*")
    .eq("id", id)
    .in("state", ["ready", "active"])
    .maybeSingle();
  databaseError(error);
  if (!asset) throw new RepositoryError("not-found", "This media is no longer available.");
  const { data: parent, error: parentError } = asset.resource_id
    ? await client
        .from("awareness_resources")
        .select("status")
        .eq("id", asset.resource_id)
        .maybeSingle()
    : { data: null, error: null };
  databaseError(parentError);
  if (asset.state !== "active" || parent?.status !== "Published")
    await requireAwarenessAdmin(client);
  const { data, error: storageError } = await client.storage
    .from(BUCKET)
    .createSignedUrl(asset.path, 60, download ? { download: asset.file_name } : {});
  if (storageError || !data)
    throw new RepositoryError("server", "The media could not be loaded. Try again.");
  return data.signedUrl;
}

export async function retireMedia(client: AwarenessClient, id: string) {
  await requireAwarenessAdmin(client);
  const { error } = await client
    .from("awareness_media_assets")
    .update({ state: "retired", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("state", ["pending", "ready"]);
  databaseError(error);
  await cleanupMedia(client);
}

export async function cleanupMedia(client: AwarenessClient) {
  try {
    // Retired rows are a durable retry queue; do not delete metadata before storage deletion succeeds.
    const { data, error } = await client
      .from("awareness_media_assets")
      .select("id,path,created_at")
      .eq("state", "retired")
      .limit(100);
    if (error) {
      console.warn("Awareness media cleanup deferred (metadata unavailable).");
      return;
    }
    for (const asset of data ?? []) {
      const { error: storageError } = await client.storage.from(BUCKET).remove([asset.path]);
      if (storageError) {
        console.warn("Awareness media cleanup deferred.", { assetId: asset.id });
        continue;
      }
      // Signed upload tokens last two hours. Keep the tombstone beyond expiry so a replay
      // after cancellation is still discoverable by the scheduled cleanup job.
      if (Date.parse(asset.created_at) > Date.now() - 125 * 60 * 1000) continue;
      const { error: deleteError } = await client
        .from("awareness_media_assets")
        .delete()
        .eq("id", asset.id)
        .eq("state", "retired");
      if (deleteError)
        console.warn("Awareness media metadata cleanup deferred.", { assetId: asset.id });
    }
  } catch {
    console.warn("Awareness media cleanup deferred (storage unavailable).");
  }
}
