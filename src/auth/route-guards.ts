import { redirect } from "@tanstack/react-router";
import type { AuthState } from "@/auth/types";
import { safeInternalPath } from "@/auth/redirect";

interface GuardInput {
  context: { auth: AuthState };
  location: { href: string };
}

export function requireLearner({ context, location }: GuardInput) {
  if (!context.auth.user) {
    throw redirect({
      to: "/login",
      search: { redirect: safeInternalPath(location.href, "/dashboard") },
    } as never);
  }
  if (context.auth.user.role !== "learner") {
    throw redirect({ to: "/admin", replace: true });
  }
}

export function requireSuperAdmin({ context, location }: GuardInput) {
  if (!context.auth.user) {
    throw redirect({
      to: "/login",
      search: { redirect: safeInternalPath(location.href, "/admin") },
    } as never);
  }
  if (context.auth.user.role !== "super_admin") {
    throw redirect({ to: "/dashboard", replace: true });
  }
}

export function requireAuthenticated({ context, location }: GuardInput) {
  if (context.auth.user) return;
  throw redirect({
    to: "/login",
    search: { redirect: safeInternalPath(location.href) },
  } as never);
}

export function redirectAuthenticated({ context }: Pick<GuardInput, "context">) {
  const user = context.auth.user;
  if (!user) return;
  throw redirect({
    to: user.role === "super_admin" ? "/admin" : "/dashboard",
    replace: true,
  });
}
