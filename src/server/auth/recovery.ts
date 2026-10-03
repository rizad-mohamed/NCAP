import type { SupabaseClient } from "@supabase/supabase-js";

/** Verified JWT evidence, not a URL flag or client-supplied cookie. */
export async function hasRecentRecovery(client: SupabaseClient) {
  const { data, error } = await client.auth.getClaims();
  if (error || !data) return false;
  const now = Math.floor(Date.now() / 1000);
  const amr = data.claims.amr;
  return (
    Array.isArray(amr) &&
    amr.some(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        entry.method === "recovery" &&
        Number.isInteger(entry.timestamp) &&
        entry.timestamp <= now &&
        now - entry.timestamp <= 900,
    )
  );
}
