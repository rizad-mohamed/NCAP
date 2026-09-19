import type { ReactNode } from "react";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { AppLink, AppShell, PublicFooter } from "@/components/layout/AppShell";
import { useSessionPreferences, type Role } from "@/state/ncap-store";
import { useAuth } from "@/auth/AuthProvider";

export function RouteShell({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: Exclude<Role, "guest">;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { session } = useSessionPreferences();
  const { user } = useAuth();
  if (requiredRole && session.role !== requiredRole) {
    const signedInWrongRole = user !== null;
    return (
      <>
        <main
          id="main-content"
          className="grid min-h-[75vh] place-items-center bg-background px-4 py-16"
        >
          <section className="panel max-w-lg p-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
              {signedInWrongRole ? (
                <ShieldAlert className="size-8" />
              ) : (
                <LockKeyhole className="size-8" />
              )}
            </span>
            <h1 className="mt-6 text-3xl font-semibold">
              {signedInWrongRole ? "Access unavailable" : "Sign in required"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {signedInWrongRole
                ? `Your account is not authorized to open the ${requiredRole} workspace.`
                : `Sign in to open the ${requiredRole} workspace.`}
            </p>
            <AppLink
              href={signedInWrongRole && session.role === "learner" ? "/dashboard" : "/login"}
              className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-white"
            >
              {signedInWrongRole && session.role === "learner"
                ? "Return to dashboard"
                : "Go to login"}
            </AppLink>
          </section>
        </main>
        <PublicFooter />
      </>
    );
  }
  return <AppShell pathname={pathname}>{children}</AppShell>;
}
