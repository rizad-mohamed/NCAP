import { createFileRoute } from "@tanstack/react-router";
import { AwarenessHubPage } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/awareness/")({
  component: () => (
    <RouteShell>
      <AwarenessHubPage />
    </RouteShell>
  ),
  head: () => ({
    meta: [
      { title: "Cybersecurity Awareness | NCAP" },
      {
        name: "description",
        content: "Practical cybersecurity articles, tips, posters, infographics, and videos.",
      },
    ],
  }),
});
