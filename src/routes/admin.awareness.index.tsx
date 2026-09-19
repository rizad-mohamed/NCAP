import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RouteShell } from "@/components/layout/RouteShell";

export const Route = createFileRoute("/admin/awareness/")({
  head: () => ({ meta: [{ title: "Manage Awareness | NCAP administration" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <RouteShell requiredRole="admin">
      <Navigate to={"/admin/awareness/articles" as never} replace />
    </RouteShell>
  ),
});
