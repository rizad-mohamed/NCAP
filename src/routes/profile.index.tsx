import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/profile/")({
  component: () => (
    <RouteShell requiredRole="learner">
      <ProfilePage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Profile | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
