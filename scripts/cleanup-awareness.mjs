// Run hourly from an operator job. Metadata is kept until storage removal succeeds.
import { cleanupAwareness } from "../supabase/functions/_shared/awareness-cleanup.mjs";
import { createClient } from "@supabase/supabase-js";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Set operator-only Supabase credentials.");
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const result = await cleanupAwareness(client);
console.log("Awareness cleanup complete.", result);
if (result.failures) process.exitCode = 1;
