import { createFileRoute } from "@tanstack/react-router";
import { ResourceListingPage, NotFoundContent } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";
const kinds = ["tips", "news", "best-practices", "posters", "infographics", "videos"] as const;
export const Route = createFileRoute("/awareness/$kind")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Cybersecurity awareness resources | NCAP" },
      {
        name: "description",
        content: "Published NCAP tips, news, posters, videos, and visual guides.",
      },
    ],
  }),
});
function Page() {
  const { kind } = Route.useParams();
  return (
    <RouteShell>
      {kinds.includes(kind as (typeof kinds)[number]) ? (
        <ResourceListingPage kind={kind as (typeof kinds)[number]} />
      ) : (
        <NotFoundContent />
      )}
    </RouteShell>
  );
}
