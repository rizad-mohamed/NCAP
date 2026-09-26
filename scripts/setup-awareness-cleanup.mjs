// Operator-only: deploy the Edge Function first, then run this once or to rotate its secret.
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
const { SUPABASE_URL, SUPABASE_ACCESS_TOKEN } = process.env;
if (!SUPABASE_URL || !SUPABASE_ACCESS_TOKEN)
  throw new Error("Set operator Supabase URL and management access token.");
const origin = new URL(SUPABASE_URL);
if (origin.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(origin.hostname))
  throw new Error("A hosted Supabase project URL is required.");
const project = origin.hostname.split(".")[0];
const token = randomBytes(32).toString("hex");
async function management(path, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new Error(
      `Maintenance configuration failed (${response.status}); inspect Supabase operator logs.`,
    );
}
await management("secrets", [{ name: "AWARENESS_CLEANUP_TOKEN", value: token }]);
// Values originate from strict URL validation and random hex, then are SQL-escaped as defense in depth.
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const values = {
  awareness_cleanup_url: `${origin.origin}/functions/v1/awareness-cleanup`,
  awareness_cleanup_token: token,
};
const secrets = Object.entries(values)
  .map(
    ([name, value]) => `
do $$ declare secret_id uuid; begin
  select id into secret_id from vault.secrets where name=${literal(name)};
  if secret_id is null then perform vault.create_secret(${literal(value)},${literal(name)});
  else perform vault.update_secret(secret_id,${literal(value)}); end if;
end $$;`,
  )
  .join("\n");
const sql = await readFile(
  new URL("../supabase/operations/awareness-cleanup.sql", import.meta.url),
  "utf8",
);
await management("database/query", {
  query: `begin;\n${secrets}\n${sql}\ncommit;`,
  read_only: false,
});
console.log("Awareness maintenance secret configured; hourly cleanup scheduled at minute 17 UTC.");
