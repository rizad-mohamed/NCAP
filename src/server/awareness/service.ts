import { parseAwareness, type AwarenessKind } from "@/domain/awareness";
import type { Json } from "@/types/database";
import { requireAwarenessAdmin, type AwarenessClient } from "./authorization";
import { databaseError } from "./errors";
import { resourcePayload } from "./mapping";
import { cleanupMedia, retireMedia } from "./media";
import { getResource } from "./queries";
export async function saveResource(client: AwarenessClient, kind: AwarenessKind, input: unknown) {
  await requireAwarenessAdmin(client);
  const record = parseAwareness(kind, input);
  const { error } = await client.rpc("save_awareness_resource", {
    payload: resourcePayload(kind, record) as Json,
    ...(record.version ? { expected_version: record.version } : {}),
  });
  if (error) {
    const payload = resourcePayload(kind, record);
    for (const id of [payload.image_id, payload.video_id])
      if (id) await retireMedia(client, id).catch(() => undefined);
    databaseError(error);
  }
  await cleanupMedia(client);
  return (await getResource(client, kind, record.id, true))!;
}
export async function deleteResource(client: AwarenessClient, id: string, version: number) {
  await requireAwarenessAdmin(client);
  const { error } = await client.rpc("delete_awareness_resource", {
    resource: id,
    expected_version: version,
  });
  databaseError(error);
  await cleanupMedia(client);
}
