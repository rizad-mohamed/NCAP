import type { LearningClient } from "@/server/learning/authorization";
import { RepositoryError } from "@/services";
import type { ContentTranslation } from "@/domain/content-translations";
export async function contentTranslations(
  client: LearningClient,
  kind: "modules" | "lessons" | "awareness",
  ids: string[],
  language: string,
  admin = false,
) {
  if (!ids.length) return [];
  const { data, error } = await client.rpc("content_translation_list", {
    target_kind: kind,
    target_ids: ids,
    target_language: language,
    admin_mode: admin,
  });
  if (error) throw new RepositoryError("server", "Translated content is temporarily unavailable.");
  return data as unknown as ContentTranslation[];
}
