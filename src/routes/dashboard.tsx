import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RouteShell requiredRole="learner">
      <DashboardPage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Learner Dashboard | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
