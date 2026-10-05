import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { requireLearningAdmin } from "@/server/learning/authorization";
import { dashboardResult } from "@/server/dashboard/service";
import { contentTranslations } from "@/server/content-translations";
import { translationSaveSchema } from "@/domain/content-translations";
import { RepositoryError } from "@/services";
import type { Json } from "@/types/database";
function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
export const getAdminTranslations = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    dashboardResult(async () => {
      const input = z
        .object({
          kind: z.enum(["modules", "lessons", "awareness"]),
          id: z.string().min(1).max(100),
          language: z.enum(["en", "si", "ta"]),
        })
        .parse(data);
      const db = client();
      await requireLearningAdmin(db);
      return contentTranslations(db, input.kind, [input.id], input.language, true);
    }),
  );
export const saveContentTranslation = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    dashboardResult(async () => {
      const payload = translationSaveSchema.parse(data);
      const db = client();
      await requireLearningAdmin(db);
      const { error } = await db.rpc("content_translation_save", { payload: payload as Json });
      if (error)
        throw new RepositoryError(
          error.code === "40001" ? "conflict" : "validation",
          error.code === "40001"
            ? "The source or translation changed. Reload before saving."
            : "Unable to save this translation. Check the details.",
        );
    }),
  );
