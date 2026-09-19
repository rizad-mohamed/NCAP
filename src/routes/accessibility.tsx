import { createFileRoute } from "@tanstack/react-router";
import { InformationalPage } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/accessibility")({
  component: () => (
    <RouteShell>
      <InformationalPage kind="accessibility" />
    </RouteShell>
  ),
  head: () => ({ meta: [{ title: "Accessibility | NCAP" }] }),
});
