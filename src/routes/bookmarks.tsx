import { createFileRoute } from "@tanstack/react-router";
import { BookmarksPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/bookmarks")({
  component: () => (
    <RouteShell requiredRole="learner">
      <BookmarksPage />
    </RouteShell>
  ),
  head: () => ({
    meta: [{ title: "Bookmarks | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
