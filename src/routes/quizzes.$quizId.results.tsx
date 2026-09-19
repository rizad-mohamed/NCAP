import { createFileRoute } from "@tanstack/react-router";
import { QuizResultsPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
import { requireLearner } from "@/auth/route-guards";
export const Route = createFileRoute("/quizzes/$quizId/results")({
  beforeLoad: requireLearner,
  component: Page,
  head: () => ({
    meta: [{ title: "Quiz Results | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
function Page() {
  const { quizId } = Route.useParams();
  return (
    <RouteShell requiredRole="learner">
      <QuizResultsPage quizId={quizId} />
    </RouteShell>
  );
}
