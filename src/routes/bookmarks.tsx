import { createFileRoute } from "@tanstack/react-router";
import { BookmarksPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
import { requireLearner } from "@/auth/route-guards";
export const Route = createFileRoute("/bookmarks")({
  beforeLoad: requireLearner,
  component: () => (
    <RouteShell requiredRole="learner">
      <BookmarksPage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Bookmarks | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
