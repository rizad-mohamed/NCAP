import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { requireLearner, type LearningClient } from "@/server/learning/authorization";
import { dashboardResult } from "@/server/dashboard/service";
import { RepositoryError } from "@/services";

function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
function check(error: { code?: string } | null) {
  if (error)
    throw new RepositoryError(
      error.code === "P0002" ? "not-found" : error.code === "42501" ? "forbidden" : "server",
      "Notifications are temporarily unavailable.",
    );
}
async function account(db: LearningClient, expectedUserId: string) {
  if ((await requireLearner(db)) !== expectedUserId)
    throw new RepositoryError("conflict", "Your account changed. Reload notifications.");
}
const identity = z.object({ expectedUserId: z.string().uuid() });
export const syncNotifications = createServerFn({ method: "POST" })
  .validator(identity)
  .handler(({ data }) =>
    dashboardResult(async () => {
      const db = client();
      await account(db, data.expectedUserId);
      const { error } = await db.rpc("notifications_sync");
      check(error);
    }),
  );
export const listNotifications = createServerFn({ method: "GET" })
  .validator(
    z.object({
      before: z.string().datetime({ offset: true }).nullable(),
      beforeId: z.string().uuid().nullable(),
      expectedUserId: z.string().uuid(),
    }),
  )
  .handler(({ data }) =>
    dashboardResult(async () => {
      const db = client();
      await account(db, data.expectedUserId);
      const result = await db.rpc("notifications_list", {
        page_before: data.before,
        before_id: data.beforeId,
        page_limit: 20,
      });
      check(result.error);
      return result.data;
    }),
  );
export const setNotificationRead = createServerFn({ method: "POST" })
  .validator(
    z.object({ id: z.string().uuid(), read: z.boolean(), expectedUserId: z.string().uuid() }),
  )
  .handler(({ data }) =>
    dashboardResult(async () => {
      const db = client();
      await account(db, data.expectedUserId);
      const { error } = await db.rpc("notifications_set_read", {
        target: data.id,
        is_read: data.read,
      });
      check(error);
    }),
  );
export const readAllNotifications = createServerFn({ method: "POST" })
  .validator(identity)
  .handler(({ data }) =>
    dashboardResult(async () => {
      const db = client();
      await account(db, data.expectedUserId);
      const { error } = await db.rpc("notifications_read_all");
      check(error);
    }),
  );
