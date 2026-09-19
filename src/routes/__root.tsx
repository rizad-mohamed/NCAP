import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, RefreshCw, ShieldAlert } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NcapProvider } from "@/state/ncap-store";
import { I18nProvider } from "@/lib/i18n";
import { NcapRepositoryProvider } from "@/services/repository-provider";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { getAuthState } from "@/auth/auth.functions";
import type { AuthState } from "@/auth/types";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="grid-motif flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="panel max-w-lg p-8 text-center sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-violet">
          <ShieldAlert className="size-8" aria-hidden="true" />
        </span>
        <p className="meta mt-6 text-violet">Error 404</p>
        <h1 className="mt-3 text-4xl font-bold text-foreground">Page not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-violet"
          >
            <Home className="size-4" aria-hidden="true" /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  void error;
  const router = useRouter();

  return (
    <div className="grid-motif flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="panel max-w-lg p-8 text-center sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-destructive-soft text-destructive">
          <ShieldAlert className="size-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-violet"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </button>
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-input bg-background px-5 text-sm font-bold text-foreground transition-colors hover:bg-accent"
          >
            <Home className="size-4" aria-hidden="true" /> Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  auth: AuthState;
}>()({
  beforeLoad: async () => ({ auth: await getAuthState() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NCAP — National Cybersecurity Awareness Platform" },
      {
        name: "description",
        content:
          "Learn practical cybersecurity skills, test your knowledge, and track your progress with NCAP.",
      },
      { name: "author", content: "NCAP" },
      { name: "application-name", content: "NCAP" },
      { name: "theme-color", content: "#0f172a" },
      { name: "color-scheme", content: "light" },
      { property: "og:title", content: "NCAP — Learn safer digital habits" },
      {
        property: "og:description",
        content:
          "A demonstration national cybersecurity awareness and learning platform for Sri Lanka.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, auth } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider state={auth}>
          <AuthenticatedApplication />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApplication() {
  const auth = useAuth();
  return (
    <NcapProvider authUser={auth.user}>
      <NcapRepositoryProvider>
        <TooltipProvider delayDuration={250}>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Outlet />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </NcapRepositoryProvider>
    </NcapProvider>
  );
}
