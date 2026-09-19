import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
import { requireLearner } from "@/auth/route-guards";
export const Route = createFileRoute("/profile/")({
  beforeLoad: requireLearner,
  component: () => (
    <RouteShell requiredRole="learner">
      <ProfilePage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Profile | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
