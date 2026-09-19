import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmailPage } from "@/features/auth/AuthPages";
export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? search["email"].slice(0, 254) : undefined,
    error: search["error"] === "link_invalid" ? "link_invalid" : undefined,
  }),
  component: VerifyEmailPage,
  head: () => ({
    meta: [{ title: "Verify Email | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
