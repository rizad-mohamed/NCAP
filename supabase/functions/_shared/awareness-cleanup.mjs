// Shared operator/hosted maintenance workflow; never imported by browser code.
export async function cleanupAwareness(client, { maxAssets = Infinity, deadline = Infinity } = {}) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const retired = await client
    .from("awareness_media_assets")
    .update({ state: "retired" })
    .in("state", ["pending", "ready"])
    .is("resource_id", null)
    .lt("created_at", cutoff);
  if (retired.error) throw new Error("Unable to mark expired Awareness uploads for cleanup.");
  let failures = 0,
    offset = 0,
    processed = 0;
  while (processed < maxAssets && Date.now() < deadline) {
    const { data, error } = await client
      .from("awareness_media_assets")
      .select("id,path,created_at")
      .eq("state", "retired")
      .order("id")
      .range(offset, offset + 99);
    if (error) throw new Error("Unable to read Awareness cleanup queue.");
    if (!data.length) break;
    for (const asset of data) {
      if (processed >= maxAssets || Date.now() >= deadline) break;
      processed++;
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
  return { failures, processed, deferred: processed >= maxAssets || Date.now() >= deadline };
}
