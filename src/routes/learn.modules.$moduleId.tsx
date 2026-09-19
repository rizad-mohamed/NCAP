import { createFileRoute } from "@tanstack/react-router";
import { ModuleDetailPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/learn/modules/$moduleId")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Cybersecurity learning module | NCAP" },
      {
        name: "description",
        content: "Explore the published lessons in this NCAP learning module.",
      },
    ],
  }),
});
function Page() {
  const { moduleId } = Route.useParams();
  return (
    <RouteShell>
      <ModuleDetailPage moduleId={moduleId} />
    </RouteShell>
  );
}
