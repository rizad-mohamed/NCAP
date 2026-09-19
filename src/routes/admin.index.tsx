import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/")({
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminDashboardPage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Administration | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
