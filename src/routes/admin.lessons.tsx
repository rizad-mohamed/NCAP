import { createFileRoute } from "@tanstack/react-router";
import { AdminContentPage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/lessons")({
  head: () => ({
    meta: [
      { title: "Lessons | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminContentPage kind="lessons" />
    </RouteShell>
  ),
});
