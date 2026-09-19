import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/profile/edit")({
  component: () => (
    <RouteShell requiredRole="learner">
      <ProfilePage edit />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Edit Profile | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
