import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/privacy")({
  component: () => (
    <RouteShell>
      <InformationalPage kind="privacy" />
    </RouteShell>
  ),
  head: () => ({ meta: [{ title: "Privacy | NCAP" }] }),
});
