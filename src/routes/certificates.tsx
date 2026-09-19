import { createFileRoute } from "@tanstack/react-router";
import { CertificatesPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/certificates")({
  component: () => (
    <RouteShell requiredRole="learner">
      <CertificatesPage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Certificates | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
