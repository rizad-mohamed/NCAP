import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireSuperAdmin } from "@/auth/route-guards";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireSuperAdmin,
  component: Outlet,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
});
