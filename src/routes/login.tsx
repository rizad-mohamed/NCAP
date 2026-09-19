import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/AuthPages";
export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Log in | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
