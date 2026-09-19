import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersPage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminUsersPage />
    </RouteShell>
  ),
});
