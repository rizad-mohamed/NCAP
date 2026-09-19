import { createFileRoute } from "@tanstack/react-router";
import { QuizInstructionsPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/quizzes/$quizId/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Quiz instructions | NCAP" },
      { name: "description", content: "Review the instructions for this NCAP knowledge check." },
    ],
  }),
});
function Page() {
  const { quizId } = Route.useParams();
  return (
    <RouteShell>
      <QuizInstructionsPage quizId={quizId} />
    </RouteShell>
  );
}
