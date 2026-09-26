// Run hourly from an operator job. Metadata is kept until storage removal succeeds.
import { createClient } from "@supabase/supabase-js";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Set operator-only Supabase credentials.");
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const retired = await client
  .from("awareness_media_assets")
  .update({ state: "retired" })
  .in("state", ["pending", "ready"])
  .is("resource_id", null)
  .lt("created_at", cutoff);
if (retired.error) throw new Error("Unable to mark expired Awareness uploads for cleanup.");
let failures = 0,
  offset = 0;
while (true) {
  const { data, error } = await client
    .from("awareness_media_assets")
    .select("id,path,created_at")
    .eq("state", "retired")
    .order("id")
    .range(offset, offset + 99);
  if (error) throw new Error("Unable to read Awareness cleanup queue.");
  if (!data.length) break;
  for (const asset of data) {
    const result = await client.storage.from("awareness-media").remove([asset.path]);
    if (result.error) {
      failures++;
      offset++;
      continue;
    }
    if (Date.parse(asset.created_at) > Date.now() - 125 * 60 * 1000) {
      offset++;
      continue;
    }
    const removal = await client
      .from("awareness_media_assets")
      .delete()
      .eq("id", asset.id)
      .eq("state", "retired");
    if (removal.error) {
      failures++;
      offset++;
    }
  }
}
console.log(`Awareness cleanup complete; ${failures} entries retained for retry.`);
if (failures) process.exitCode = 1;
