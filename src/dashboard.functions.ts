import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import {
  dashboardResult,
  learnerDashboard,
  adminDashboard,
  adminReport,
  adminAnnouncements,
  adminUsers,
  saveAnnouncement,
  deleteAnnouncement,
  beginLesson,
  heartbeat,
} from "@/server/dashboard/service";

function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
export const getLearnerDashboard = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => learnerDashboard(client(), data)));
export const getAdminDashboard = createServerFn({ method: "GET" }).handler(() =>
  dashboardResult(() => adminDashboard(client())),
);
export const getAdminDashboardReport = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => adminReport(client(), data)));
export const getDashboardAnnouncements = createServerFn({ method: "GET" }).handler(() =>
  dashboardResult(() => adminAnnouncements(client())),
);
export const getDashboardUsers = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => adminUsers(client(), data)));
export const saveDashboardAnnouncement = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => saveAnnouncement(client(), data)));
export const deleteDashboardAnnouncement = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => deleteAnnouncement(client(), data)));
export const beginDashboardLesson = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => beginLesson(client(), data)));
export const heartbeatDashboardLesson = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => dashboardResult(() => heartbeat(client(), data)));
