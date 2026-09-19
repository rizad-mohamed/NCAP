import { createFileRoute } from "@tanstack/react-router";
import { NotFoundContent } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [{ title: "Page not found | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => (
    <RouteShell>
      <NotFoundContent />
    </RouteShell>
  ),
});
