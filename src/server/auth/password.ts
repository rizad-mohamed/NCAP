import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerAuthEnv } from "./env";

/** Auth checks current_password only when its project setting is enabled. */
export async function verifyCurrentPassword(id: string, email: string, password: string) {
  const env = getServerAuthEnv();
  const verifier = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.signInWithPassword({ email, password });
  const valid = !error && data.user?.id === id;
  if (data.session) await verifier.auth.signOut({ scope: "local" });
  return valid;
}
