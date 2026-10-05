import { z } from "zod";
import { lessonBlocksSchema } from "./validation";
export const translationContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    summary: z.string().max(4000).optional(),
    description: z.string().max(4000).optional(),
    text: z.string().max(4000).optional(),
    alt: z.string().max(4000).optional(),
    transcript: z.string().max(50000).optional(),
    body: z.array(z.string().max(10000)).max(100).optional(),
    steps: z.array(z.string().max(10000)).max(100).optional(),
    points: z.array(z.string().max(10000)).max(100).optional(),
    objectives: z.array(z.string().trim().min(1).max(500)).min(1).max(30).optional(),
    blocks: lessonBlocksSchema.optional(),
  })
  .strict();
export const translationSaveSchema = z.object({
  kind: z.enum(["modules", "lessons", "awareness"]),
  sourceId: z.string().min(1).max(100),
  sourceVersion: z.number().int().positive(),
  expectedVersion: z.number().int().min(0),
  language: z.enum(["en", "si", "ta"]),
  status: z.enum(["Draft", "Published"]),
  content: translationContentSchema,
});
export type TranslationContent = z.infer<typeof translationContentSchema>;
export interface ContentTranslation {
  source_id: string;
  content: TranslationContent;
  language: "en" | "si" | "ta";
  status?: "Draft" | "Published";
  version?: number;
  stale?: boolean;
}
/** Select only validated text; ownership, media, relationships and status cannot be overlaid. */
export function translatedRecords<T extends { id: string }>(
  records: T[],
  translations: ContentTranslation[],
): T[] {
  const patches = new Map(
    translations.map((t) => [t.source_id, translationContentSchema.parse(t.content)]),
  );
  return records.map((record) => {
    const patch = patches.get(record.id);
    const video = "video" in record ? record.video : null;
    return {
      ...record,
      ...patch,
      ...(patch?.transcript && video && typeof video === "object"
        ? { video: { ...video, transcript: patch.transcript } }
        : {}),
    };
  });
}
