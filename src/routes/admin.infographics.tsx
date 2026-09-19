import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/infographics")({
  head: () => ({
    meta: [
      { title: "Infographics | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <Navigate to={"/admin/awareness/infographics" as never} replace />
    </RouteShell>
  ),
});
