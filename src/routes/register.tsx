import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/AuthPages";
import { redirectAuthenticated } from "@/auth/route-guards";
export const Route = createFileRoute("/register")({
  beforeLoad: redirectAuthenticated,
  component: RegisterPage,
  head: () => ({
    meta: [{ title: "Register | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
