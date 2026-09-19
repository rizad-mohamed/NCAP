import { createFileRoute } from "@tanstack/react-router";
import { QuizzesPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/quizzes/")({
  component: () => (
    <RouteShell>
      <QuizzesPage />
    </RouteShell>
  ),
  head: () => ({ meta: [{ title: "Knowledge Assessments | NCAP" }] }),
});
