import { createFileRoute } from "@tanstack/react-router";
import { LearningSearchPage } from "@/features/learning/LearningPages";
import { RouteShell } from "@/components/layout/RouteShell";
import { z } from "zod";
export const Route = createFileRoute("/learn/search")({
  validateSearch: z.object({ q: z.string().trim().max(120).optional().catch(undefined) }),
  component: () => (
    <RouteShell>
      <LearningSearchPage />
    </RouteShell>
  ),
  head: () => ({ meta: [{ title: "Search Learning | NCAP" }] }),
});
