import { createFileRoute } from "@tanstack/react-router";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getServerAuthEnv } from "@/server/auth/env";
import { safeInternalPath } from "@/auth/redirect";

export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code");
        const next = safeInternalPath(requestUrl.searchParams.get("next"), "/dashboard");
        const appUrl = getServerAuthEnv().APP_URL;

        if (!code) {
          return Response.redirect(new URL("/verify-email?error=link_invalid", appUrl), 303);
        }

        const supabase = createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          return Response.redirect(new URL("/verify-email?error=link_invalid", appUrl), 303);
        }

        return Response.redirect(new URL(next, appUrl), 303);
      },
    },
  },
  component: () => (
    <main id="main-content" className="grid min-h-dvh place-items-center bg-background px-4">
      <p className="font-semibold" aria-live="polite">
        Completing secure sign-in…
      </p>
    </main>
  ),
});
