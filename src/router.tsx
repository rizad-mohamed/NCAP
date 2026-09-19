import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { AuthState } from "@/auth/types";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: { user: null } satisfies AuthState },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 250,
    defaultPendingComponent: () => (
      <main
        id="main-content"
        className="grid min-h-dvh place-items-center bg-background px-4"
        aria-busy="true"
      >
        <div className="panel max-w-sm p-8 text-center">
          <p className="meta text-primary">NCAP</p>
          <p className="mt-3 text-lg font-semibold">Loading this page…</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your local demo data is being prepared.
          </p>
        </div>
      </main>
    ),
  });

  return router;
};
