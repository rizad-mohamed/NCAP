import { createFileRoute } from "@tanstack/react-router";
import { ArticlesPage } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/awareness/articles/")({
  component: () => (
    <RouteShell>
      <ArticlesPage />
    </RouteShell>
  ),
  head: () => ({ meta: [{ title: "Cybersecurity Articles | NCAP" }] }),
});
