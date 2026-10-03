import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import { getServerAuthEnv } from "./env";
import type { Database } from "@/types/database";

/** Fail closed. Counters are shared by every worker and never lock an account globally. */
export async function allowAuthAttempt(action: string, identity: string) {
  const env = getServerAuthEnv();
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) return false;
  // Cloudflare overwrites this header. Do not enable it behind an untrusted proxy.
  const source =
    process.env["AUTH_TRUST_PROXY"] === "cloudflare"
      ? getRequestHeader("cf-connecting-ip")
      : new URL(env.APP_URL).hostname === "127.0.0.1" ||
          new URL(env.APP_URL).hostname === "localhost"
        ? "local-development"
        : undefined;
  if (!source) return false;
  const client = createClient<Database>(env.SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const consume = async (value: string, max: number, seconds: number) => {
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    const bucket = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    const { data, error } = await client.rpc("auth_consume_attempt", {
      bucket_key: bucket,
      max_attempts: max,
      window_seconds: seconds,
    });
    return !error && data === true;
  };
  return (
    (await consume(`source:${source}`, 120, 600)) &&
    (await consume(
      `${action}:${source}:${identity.trim().toLowerCase()}`,
      action === "signIn" ? 10 : action === "adminChange" ? 30 : 5,
      300,
    ))
  );
}
