import { createClient } from "@supabase/supabase-js";
import { cleanupLearning } from "../supabase/functions/_shared/learning-cleanup.mjs";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Set operator-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const result = await cleanupLearning(client);
console.log(JSON.stringify(result));
if (result.failures) process.exitCode = 1;
