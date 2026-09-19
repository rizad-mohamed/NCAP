import "@tanstack/react-start/server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { Database } from "@/types/database";
import { getServerAuthEnv } from "@/server/auth/env";

export function createSupabaseServerClient() {
  const env = getServerAuthEnv();
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
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          setCookie(name, value, options as CookieOptions);
        }
      },
    },
  });
}
