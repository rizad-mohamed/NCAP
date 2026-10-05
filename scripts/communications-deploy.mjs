import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index),
        line
          .slice(index + 1)
          .trim()
          .replace(/^(["'])(.*)\1$/, "$2"),
      ];
    }),
);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (ref !== "zsaefnfgauqvstptetdw")
  throw new Error("Only the confirmed NCAP staging project is supported.");
const headers = {
  authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
  "content-type": "application/json",
};
async function sql(query, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Staging SQL request failed (${response.status}).`);
  return response.json();
}
const project = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
  headers,
  signal: AbortSignal.timeout(30000),
});
if (!project.ok || (await project.json()).id !== ref)
  throw new Error("Staging project confirmation failed.");
const history = await sql(
  "select version,name from supabase_migrations.schema_migrations order by version",
);
if (!history.some((row) => row.version === "202610040003"))
  throw new Error("Required authentication migrations are not deployed.");
const migrations = [
  "202610040004_announcements_notifications",
  "202610040005_content_translations",
  "202610040006_notification_visibility",
];
if (process.argv[2] === "apply") {
  for (const name of migrations) {
    const version = name.split("_")[0];
    if (history.some((row) => row.version === version)) continue;
    const migration = readFileSync(`supabase/migrations/${name}.sql`, "utf8");
    if (!/^begin;/i.test(migration) || !/commit;\s*$/i.test(migration))
      throw new Error("Migration transaction boundary missing.");
    await sql(
      migration.replace(
        /commit;\s*$/i,
        `insert into supabase_migrations.schema_migrations(version,name) values('${version}','${name.slice(13)}');\ncommit;`,
      ),
      false,
    );
    console.log(`${name}: applied and recorded transactionally`);
  }
}
const state = await sql(
  "select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('announcement_audit','in_app_notifications','notification_generation_audit','content_translations','content_translation_audit') order by c.relname",
);
console.log(
  `Confirmed staging project; ${history.length} prior migration entries. Feature tables: ${state.length}; RLS enabled: ${state.every((row) => row.relrowsecurity)}.`,
);
const finalHistory = await sql(
  "select version,name from supabase_migrations.schema_migrations where version in ('202610040004','202610040005','202610040006') order by version",
);
console.log(JSON.stringify(finalHistory));
