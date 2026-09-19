import { createFileRoute } from "@tanstack/react-router";
import { AdminProfilePage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [
      { title: "Profile | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminProfilePage />
    </RouteShell>
  ),
});
