import { createFileRoute } from "@tanstack/react-router";
import { AdminModulesTopicsPage } from "@/features/admin/AdminModulesTopicsPage";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/topics")({
  head: () => ({
    meta: [
      { title: "Manage Modules & Topics | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminModulesTopicsPage />
    </RouteShell>
  ),
});
