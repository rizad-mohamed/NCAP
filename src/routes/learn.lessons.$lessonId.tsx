import { createFileRoute } from "@tanstack/react-router";
import { LessonPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/learn/lessons/$lessonId")({
  component: Page,
  head: () => ({
    meta: [{ title: "Learning lesson | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
function Page() {
  const { lessonId } = Route.useParams();
  return (
    <RouteShell requiredRole="learner">
      <LessonPage lessonId={lessonId} />
    </RouteShell>
  );
}
