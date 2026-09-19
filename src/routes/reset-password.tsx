import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/features/auth/AuthPages";
import { requireAuthenticated } from "@/auth/route-guards";

export const Route = createFileRoute("/reset-password")({
  beforeLoad: requireAuthenticated,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Choose a new password | NCAP" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
