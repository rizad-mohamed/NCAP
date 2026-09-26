import { parseAwareness, type AwarenessKind, type AwarenessRecord } from "@/domain/awareness";
import type { MediaAsset, VideoAsset } from "@/data/types";
import type { ResourceRow, AssetRow } from "./types";
import type { Json } from "@/types/database";
export function resourcePayload(kind: AwarenessKind, input: unknown): Partial<ResourceRow> {
  const r = parseAwareness(kind, input);
  const content: Record<string, Json> = {};
  for (const field of [
    "body",
    "steps",
    "points",
    "durationLabel",
    "chapters",
    "transcript",
    "sourceUrl",
    "posterUrl",
    "imageUrl",
    "format",
  ]) {
    const value = (r as unknown as Record<string, Json>)[field];
    if (value !== undefined) content[field] = value;
  }
  return {
    id: r.id,
    kind,
    slug: r.slug,
    title: r.title,
    summary:
      "summary" in r
        ? r.summary
        : "text" in r
          ? r.text
          : "description" in r
            ? r.description
            : "alt" in r
              ? r.alt
              : "",
    topic: "category" in r ? r.category : "topic" in r ? r.topic : r.tag,
    language: r.language,
    status: r.status,
    display_order: r.order,
    featured: r.featured,
    published_at: ("date" in r ? r.date : r.publishedAt) || null,
    author: r.author,
    tags: r.tags,
    reading_minutes: "readingMinutes" in r ? r.readingMinutes : null,
    content,
    image_id: "image" in r ? (r.image?.id ?? null) : "poster" in r ? (r.poster?.id ?? null) : null,
    video_id: "video" in r ? (r.video?.id ?? null) : null,
  };
}
export function assetRecord(a: AssetRow): MediaAsset | VideoAsset {
  const base = {
    id: a.id,
    fileName: a.file_name,
    sizeBytes: a.size_bytes,
    width: a.width,
    height: a.height,
    storageKey: a.id,
    status: "ready" as const,
  };
  return a.role === "image"
    ? { ...base, mimeType: a.mime_type as MediaAsset["mimeType"], altText: a.alt_text }
    : {
        ...base,
        mimeType: a.mime_type as VideoAsset["mimeType"],
        durationSeconds: a.duration_seconds!,
      };
}
export function resourceRecord(r: ResourceRow, assets: AssetRow[] = []): AwarenessRecord {
  const common = {
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    order: r.display_order,
    featured: r.featured,
    version: r.version,
    language: r.language,
    author: r.author,
    tags: r.tags,
    publishedAt: r.published_at ?? "",
  };
  const image = assets.find((a) => a.id === r.image_id);
  const video = assets.find((a) => a.id === r.video_id);
  const imageFields = image ? { image: assetRecord(image) } : {};
  const content = r.content as Record<string, Json>;
  const fields =
    r.kind === "articles"
      ? { category: r.topic, summary: r.summary, readingMinutes: r.reading_minutes, ...imageFields }
      : r.kind === "cyberTips"
        ? { topic: r.topic, text: r.summary }
        : r.kind === "newsUpdates"
          ? { tag: r.topic, summary: r.summary, date: r.published_at ?? "" }
          : r.kind === "bestPractices"
            ? { topic: r.topic, summary: r.summary }
            : r.kind === "posters"
              ? { topic: r.topic, description: r.summary, file: "", ...imageFields }
              : r.kind === "infographics"
                ? { category: r.topic, alt: r.summary, file: "", ...imageFields }
                : {
                    category: r.topic,
                    description: r.summary,
                    ...(image ? { poster: assetRecord(image) } : {}),
                    ...(video ? { video: assetRecord(video) } : {}),
                  };
  return { ...content, ...common, ...fields } as unknown as AwarenessRecord;
}
