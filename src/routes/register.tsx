import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/AuthPages";
export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({
    meta: [{ title: "Register | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
