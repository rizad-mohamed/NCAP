import { createFileRoute } from "@tanstack/react-router";
import { QuizRunnerPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
import { requireLearner } from "@/auth/route-guards";
export const Route = createFileRoute("/quizzes/$quizId/run")({
  beforeLoad: requireLearner,
  component: Page,
  head: () => ({
    meta: [{ title: "Quiz Attempt | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
function Page() {
  const { quizId } = Route.useParams();
  return (
    <RouteShell requiredRole="learner">
      <QuizRunnerPage quizId={quizId} />
    </RouteShell>
  );
}
