import { createFileRoute } from "@tanstack/react-router";
import { LearningCataloguePage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/learn/")({
  component: () => (
    <RouteShell>
      <LearningCataloguePage />
    </RouteShell>
  ),
  head: () => ({ meta: [{ title: "Learning Modules | NCAP" }] }),
});
