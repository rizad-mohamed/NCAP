import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/posters")({
  head: () => ({
    meta: [
      { title: "Posters | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <Navigate to={"/admin/awareness/posters" as never} replace />
    </RouteShell>
  ),
});
