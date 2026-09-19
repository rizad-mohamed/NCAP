import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/articles")({
  head: () => ({
    meta: [
      { title: "Articles | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <Navigate to={"/admin/awareness/articles" as never} replace />
    </RouteShell>
  ),
});
