import { createFileRoute } from "@tanstack/react-router";
import { AdminReportsPage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminReportsPage />
    </RouteShell>
  ),
});
