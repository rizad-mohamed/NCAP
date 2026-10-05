import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { requireLearner } from "@/server/learning/authorization";
import { dashboardResult } from "@/server/dashboard/service";
import { RepositoryError } from "@/services";

export const saveProfileLanguage = createServerFn({ method: "POST" })
  .validator(z.object({ language: z.enum(["en", "si", "ta"]), expectedUserId: z.string().uuid() }))
  .handler(({ data }) =>
    dashboardResult(async () => {
      setResponseHeaders(
        new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
      );
      const db = createSupabaseServerClient();
      const id = await requireLearner(db);
      if (id !== data.expectedUserId)
        throw new RepositoryError(
          "conflict",
          "Your account changed. Reload before changing language.",
        );
      const { data: profile, error } = await db
        .from("profiles")
        .update({ language: data.language })
        .eq("id", id)
        .eq("status", "active")
        .select("id")
        .single();
      if (error || !profile)
        throw new RepositoryError("forbidden", "Unable to save your language preference.");
    }),
  );
