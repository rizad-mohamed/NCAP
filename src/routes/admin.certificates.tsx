import { createFileRoute } from "@tanstack/react-router";
import { AdminCertificatesPage } from "@/features/admin/AdminPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/certificates")({
  head: () => ({
    meta: [
      { title: "Certificates | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminCertificatesPage />
    </RouteShell>
  ),
});
