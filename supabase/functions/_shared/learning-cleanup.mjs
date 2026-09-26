// Operator-only durable cleanup. Storage deletion must succeed before removing metadata.
export async function cleanupLearning(client, { maxAssets = 500, deadline = Infinity } = {}) {
  const retired = await client.rpc("retire_learning_media");
  if (retired.error) throw new Error("Unable to retire abandoned Learning uploads.");
  let processed = 0,
    failures = 0,
    offset = 0;
  while (processed < maxAssets && Date.now() < deadline) {
    const { data, error } = await client
      .from("learning_media_assets")
      .select("id,path,created_at")
      .eq("state", "retired")
      .order("id")
      .range(offset, offset + Math.min(99, maxAssets - processed - 1));
    if (error) throw new Error("Unable to read Learning cleanup queue.");
    if (!data.length) break;
    for (const asset of data) {
      if (Date.now() >= deadline) break;
      processed++;
      const removal = await client.storage.from("learning-media").remove([asset.path]);
      if (removal.error) {
        failures++;
        offset++;
        continue;
      }
      // Upload tokens live for two hours; preserve tombstones beyond token expiry.
      if (Date.parse(asset.created_at) > Date.now() - 125 * 60 * 1000) {
        offset++;
        continue;
      }
      const deletion = await client
        .from("learning_media_assets")
        .delete()
        .eq("id", asset.id)
        .eq("state", "retired");
      if (deletion.error) {
        failures++;
        offset++;
      }
    }
  }
  return { processed, failures, deferred: processed >= maxAssets || Date.now() >= deadline };
}
