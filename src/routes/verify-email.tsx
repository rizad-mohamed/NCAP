import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmailPage } from "@/features/auth/AuthPages";
export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  head: () => ({
    meta: [{ title: "Verify Email | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
