import { useInterfaceText } from "@/lib/i18n";
import type { ReactNode } from "react";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { AppLink, AppShell, PublicFooter } from "@/components/layout/AppShell";
import { useSessionPreferences, useNcap, type Role } from "@/state/ncap-store";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";

export function RouteShell({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: Exclude<Role, "guest">;
}) {
  const uiText = useInterfaceText();

  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { session } = useSessionPreferences();
  const { user } = useAuth();
  const { learningPending, learningError } = useNcap();
  const queryClient = useQueryClient();
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
  const learningPage =
    pathname.startsWith("/learn") ||
    ["/dashboard", "/bookmarks", "/admin/topics", "/admin/lessons"].includes(pathname);
  return (
    <AppShell pathname={pathname}>
      {learningPage && (learningPending || learningError) ? (
        <div
          className={learningPending ? "container-ncap min-h-screen py-12" : "container-ncap py-12"}
          role={learningError ? "alert" : "status"}
        >
          <p>{learningError?.message ?? "Loading learning content…"}</p>
          {learningError && (
            <button
              className="mt-4 rounded-lg border px-4 py-3"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["repository"] });
                void queryClient.invalidateQueries({ queryKey: ["learning-state"] });
              }}
            >
              {uiText("Try again")}{" "}
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </AppShell>
  );
}
