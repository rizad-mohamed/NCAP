import "@tanstack/react-start/server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getCookies, setCookie, setResponseHeaders } from "@tanstack/react-start/server";
import type { Database } from "@/types/database";
import { getServerAuthEnv } from "@/server/auth/env";

export function createSupabaseServerClient(settings?: { persistSessionCookie: boolean }) {
  const env = getServerAuthEnv();
  const persistent =
    settings?.persistSessionCookie ?? getCookies()["ncap-session-persistent"] === "1";
  const secure = new URL(env.APP_URL).protocol === "https:";

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure,
    },
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies, headers) {
        setResponseHeaders(new Headers(headers));
        for (const { name, value, options } of cookies) {
          const hardened: CookieOptions = {
            ...options,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure,
          };
          if (!persistent && value) {
            delete hardened.maxAge;
            delete hardened.expires;
          }
          setCookie(name, value, hardened);
        }
      },
    },
  });
}
