import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/AuthPages";
import { redirectAuthenticated } from "@/auth/route-guards";
import { safeInternalPath } from "@/auth/redirect";
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search["redirect"] ? safeInternalPath(search["redirect"], "/dashboard") : undefined,
  }),
  beforeLoad: redirectAuthenticated,
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Log in | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
