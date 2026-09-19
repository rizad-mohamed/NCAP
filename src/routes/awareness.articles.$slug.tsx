import { createFileRoute } from "@tanstack/react-router";
import { ArticleDetailPage } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/awareness/articles/$slug")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Cybersecurity article | NCAP" },
      { name: "description", content: "A practical cybersecurity awareness article from NCAP." },
    ],
  }),
});
function Page() {
  const { slug } = Route.useParams();
  return (
    <RouteShell>
      <ArticleDetailPage slug={slug} />
    </RouteShell>
  );
}
