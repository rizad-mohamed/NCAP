import { readFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const equals = line.indexOf("=");
      return [line.slice(0, equals), line.slice(equals + 1)];
    }),
);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
const token = env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) throw new Error("SUPABASE_URL and SUPABASE_ACCESS_TOKEN are required.");
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
async function sql(query, readOnly = true) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase query failed (${response.status}): ${body.slice(0, 1000)}`);
  }
  return response.json();
}
const version = "202609300001";
const migration = await sql(
  `select version from supabase_migrations.schema_migrations where version='${version}'`,
);
const sessionVersion = "202609300002";
const sessionMigration = await sql(
  `select version from supabase_migrations.schema_migrations where version='${sessionVersion}'`,
);
const tables = await sql(
  "select to_regclass('public.dashboard_announcements') as announcements, to_regclass('public.dashboard_learning_sessions') as sessions",
);
const columns = await sql(
  "select column_name,is_nullable,data_type from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations' order by ordinal_position",
);
const previous = await sql(
  "select version,name,coalesce(array_length(statements,1),0) as statements from supabase_migrations.schema_migrations order by version desc limit 1",
);
console.log(
  JSON.stringify({
    project: ref,
    recorded: migration.length > 0,
    sessionLimitRecorded: sessionMigration.length > 0,
    tables: tables[0],
    historyColumns: columns,
    previous,
  }),
);
if (process.argv[2] === "verify") {
  if (!migration.length || !sessionMigration.length)
    throw new Error("Dashboard migrations are not recorded.");
  const rls = await sql(
    "select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname like 'dashboard_%' and relkind='r' order by relname",
  );
  if (rls.length !== 4 || rls.some((row) => !row.relrowsecurity))
    throw new Error("Dashboard RLS verification failed.");
  for (const [path, method] of [
    ["rpc/dashboard_admin", "POST"],
    ["rpc/dashboard_learner", "POST"],
    ["dashboard_user_badges?select=*", "GET"],
  ]) {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
        "content-type": "application/json",
      },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
    if (response.ok) throw new Error(`Anonymous access unexpectedly succeeded: ${path}`);
    console.log(`Anonymous ${path}: denied (${response.status})`);
  }
  console.log("Live Dashboard schema and anonymous access checks passed.");
  process.exit(0);
}
if (process.argv[2] === "apply-sessions") {
  if (!migration.length || sessionMigration.length || !tables[0]?.sessions)
    throw new Error(
      "Session migration preconditions failed; inspect remote state before retrying.",
    );
  const existing = await sql(
    "select column_name from information_schema.columns where table_schema='public' and table_name='dashboard_learning_sessions' and column_name='ended_at'",
  );
  if (existing.length)
    throw new Error("Session limit appears partially applied; inspect before retrying.");
  const file = await readFile(
    new URL("../supabase/migrations/202609300002_dashboard_session_limit.sql", import.meta.url),
    "utf8",
  );
  if (!/\bcommit;\s*$/i.test(file)) throw new Error("Migration must end with COMMIT.");
  await sql(
    file.replace(
      /\bcommit;\s*$/i,
      "insert into supabase_migrations.schema_migrations(version,name) values ('202609300002','dashboard_session_limit');\ncommit;",
    ),
    false,
  );
  const verified = await sql(
    `select version from supabase_migrations.schema_migrations where version='${sessionVersion}'`,
  );
  if (!verified.length) throw new Error("Session limit migration history was not recorded.");
  console.log("Session limit migration applied and recorded.");
  process.exit(0);
}
if (process.argv[2] !== "apply") process.exit(0);
if (migration.length || tables[0]?.announcements || tables[0]?.sessions)
  throw new Error(
    "Dashboard migration already exists or is partially applied; inspect before retrying.",
  );
const file = await readFile(
  new URL("../supabase/migrations/202609300001_dashboard.sql", import.meta.url),
  "utf8",
);
if (!/\bcommit;\s*$/i.test(file)) throw new Error("Migration must end with COMMIT.");
const tracked = file.replace(
  /\bcommit;\s*$/i,
  "insert into supabase_migrations.schema_migrations(version,name) values ('202609300001','dashboard');\ncommit;",
);
await sql(tracked, false);
const verified = await sql(
  "select to_regclass('public.dashboard_announcements') as announcements, to_regclass('public.dashboard_learning_sessions') as sessions",
);
if (!verified[0]?.announcements || !verified[0]?.sessions)
  throw new Error("Dashboard tables were not created.");
const history = await sql(
  `select version from supabase_migrations.schema_migrations where version='${version}'`,
);
if (!history.length) throw new Error("Dashboard migration history was not recorded.");
const rls = await sql(
  "select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname like 'dashboard_%' and relkind='r' order by relname",
);
if (rls.length !== 4 || rls.some((row) => !row.relrowsecurity))
  throw new Error("Dashboard RLS verification failed.");
console.log("Dashboard migration applied, recorded, and RLS enabled on all four tables.");
