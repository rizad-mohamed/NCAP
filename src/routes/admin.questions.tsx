import { createFileRoute } from "@tanstack/react-router";
import { AdminQuizPage } from "@/features/admin/AdminQuizPage";
import { RouteShell } from "@/components/layout/RouteShell";
export const Route = createFileRoute("/admin/questions")({
  head: () => ({
    meta: [
      { title: "Quiz questions | NCAP administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RouteShell requiredRole="admin">
      <AdminQuizPage />
    </RouteShell>
  ),
});
