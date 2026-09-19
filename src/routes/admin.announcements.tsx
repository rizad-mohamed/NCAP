import { createFileRoute } from "@tanstack/react-router";
import { AdminAnnouncementsPage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminAnnouncementsPage />
    </RouteShell>
  ),
});
