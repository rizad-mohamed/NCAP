import { awarenessListSchema, type AwarenessKind } from "@/domain/awareness";
import type { AwarenessClient } from "./authorization";
import { requireAwarenessAdmin } from "./authorization";
import { databaseError } from "./errors";
import { resourceRecord } from "./mapping";
import type { ResourceRow } from "./types";
async function records(client: AwarenessClient, rows: ResourceRow[]) {
  const ids = rows
    .flatMap((r) => [r.image_id, r.video_id])
    .filter((id): id is string => Boolean(id));
  if (!ids.length) return rows.map((row) => resourceRecord(row));
  const { data, error } = await client.from("awareness_media_assets").select("*").in("id", ids);
  databaseError(error);
  return rows.map((row) => resourceRecord(row, data ?? []));
}
export async function listResources(client: AwarenessClient, input: unknown) {
  const filter = awarenessListSchema.parse(input);
  if (filter.admin) await requireAwarenessAdmin(client);
  let query = client
    .from("awareness_resources")
    .select("*", { count: "exact" })
    .eq("kind", filter.kind);
  // Explicit restriction even when a Super Admin uses a public screen.
  if (!filter.admin) query = query.eq("status", "Published");
  else if (filter.status) query = query.eq("status", filter.status);
  if (filter.topic) query = query.eq("topic", filter.topic);
  if (filter.search)
    query = query.ilike(
      filter.kind === "articles" || filter.admin ? "search_text" : "search_document",
      `%${filter.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
    );
  const field =
    filter.sort === "newest" ? "published_at" : filter.sort === "title" ? "title" : "display_order";
  const { data, count, error } = await query
    .order(field, { ascending: filter.sort !== "newest", nullsFirst: false })
    .order("id")
    .range(filter.offset, filter.offset + filter.limit - 1);
  databaseError(error);
  return { items: await records(client, data ?? []), total: count ?? 0 };
}
export async function getResource(
  client: AwarenessClient,
  kind: AwarenessKind,
  key: string,
  admin = false,
) {
  if (admin) await requireAwarenessAdmin(client);
  let query = client.from("awareness_resources").select("*").eq("kind", kind);
  query = /^[0-9a-f-]{36}$/i.test(key) ? query.eq("id", key) : query.eq("slug", key);
  if (!admin) query = query.eq("status", "Published");
  const { data, error } = await query.maybeSingle();
  databaseError(error);
  return data ? (await records(client, [data]))[0]! : null;
}
export async function summary(client: AwarenessClient) {
  const { data, error } = await client.rpc("awareness_summary");
  databaseError(error);
  const { data: rows, error: featuredError } = await client
    .from("awareness_resources")
    .select("*")
    .eq("kind", "articles")
    .eq("status", "Published")
    .order("featured", { ascending: false })
    .order("display_order")
    .order("id")
    .limit(1);
  databaseError(featuredError);
  return {
    kinds: data as Partial<Record<AwarenessKind, { count: number; topics: string[] }>>,
    featured: (await records(client, rows ?? []))[0] ?? null,
  };
}
