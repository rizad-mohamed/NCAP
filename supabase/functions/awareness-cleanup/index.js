import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { cleanupAwareness } from "../_shared/awareness-cleanup.mjs";

// This is an operator-only scheduled job, not an application API.
// The gateway JWT check is replaced by a dedicated, random maintenance secret.
async function authorized(request) {
  const expected = Deno.env.get("AWARENESS_CLEANUP_TOKEN");
  const supplied = request.headers.get("x-awareness-cleanup-token");
  if (!expected || !supplied || supplied.length > 256) return false;
  const digest = async (value) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(expected), digest(supplied)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

Deno.serve(async (request) => {
  if (!(await authorized(request))) return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const result = await cleanupAwareness(client, { maxAssets: 100, deadline: Date.now() + 90000 });
    console.log("Awareness scheduled cleanup", result);
    return Response.json(result, { status: result.failures ? 500 : 200 });
  } catch {
    console.error("Awareness scheduled cleanup failed; retry required.");
    return Response.json({ error: "Cleanup deferred" }, { status: 500 });
  }
});
