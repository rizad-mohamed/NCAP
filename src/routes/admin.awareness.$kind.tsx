import { createFileRoute } from "@tanstack/react-router";
import { AdminAwarenessPage, type AwarenessKind } from "@/features/admin/AdminAwarenessPage";
import { NotFoundContent } from "@/features/public/PublicPages";
import { RouteShell } from "@/components/layout/RouteShell";

const kinds: AwarenessKind[] = ["articles", "cyber-tips", "updates", "best-practices", "posters", "infographics", "videos"];

export const Route = createFileRoute("/admin/awareness/$kind")({
  head: () => ({ meta: [{ title: "Manage Awareness | NCAP administration" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Page,
});

function Page() {
  const { kind } = Route.useParams();
  return <RouteShell requiredRole="admin">{kinds.includes(kind as AwarenessKind) ? <AdminAwarenessPage kind={kind as AwarenessKind} /> : <NotFoundContent />}</RouteShell>;
}
