import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [
        line.slice(0, i),
        line
          .slice(i + 1)
          .trim()
          .replace(/^(["'])(.*)\1$/, "$2"),
      ];
    }),
);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (process.argv[2] !== "inspect" && ref !== "zsaefnfgauqvstptetdw")
  throw new Error(
    "Authentication mutations are restricted to the confirmed NCAP_V1.0 staging project.",
  );
const headers = {
  authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
  "content-type": "application/json",
};
async function sql(query, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  if (!response.ok) throw new Error(`Database operation failed (${response.status}).`);
  return response.json();
}
const version = "202610040001";
const history = await sql(
  "select version from supabase_migrations.schema_migrations order by version",
);
console.log(JSON.stringify({ migrationHistory: history.map((row) => row.version) }));
if (process.argv[2] === "apply") {
  if (
    !history.some((row) => row.version === "202609300004") ||
    history.some((row) => row.version === version)
  )
    throw new Error("Migration preconditions failed. Inspect staging history.");
  const objects = await sql(
    "select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('avatar','interests')",
  );
  if (objects.length) throw new Error("Unrecorded profile fields require inspection.");
  const migration = readFileSync(`supabase/migrations/${version}_auth_finalization.sql`, "utf8");
  await sql(
    migration.replace(
      /commit;\s*$/i,
      `insert into supabase_migrations.schema_migrations(version,name) values('${version}','auth_finalization');\ncommit;`,
    ),
    false,
  );
  console.log("Authentication migration applied transactionally and recorded.");
}
if (process.argv[2] === "apply-permissions") {
  if (
    !history.some((row) => row.version === version) ||
    history.some((row) => row.version === "202610040002")
  )
    throw new Error("Constraint correction preconditions failed.");
  const migration = readFileSync(
    "supabase/migrations/202610040002_auth_constraint_permissions.sql",
    "utf8",
  );
  await sql(
    migration.replace(
      /commit;\s*$/i,
      "insert into supabase_migrations.schema_migrations(version,name) values('202610040002','auth_constraint_permissions');\ncommit;",
    ),
    false,
  );
  console.log("Authentication constraint permission correction applied and recorded.");
}
if (process.argv[2] === "apply-avatar-constraints") {
  if (
    !history.some((row) => row.version === "202610040002") ||
    history.some((row) => row.version === "202610040003")
  )
    throw new Error("Avatar constraint preconditions failed.");
  const migration = readFileSync(
    "supabase/migrations/202610040003_profile_avatar_constraints.sql",
    "utf8",
  );
  await sql(
    migration.replace(
      /commit;\s*$/i,
      "insert into supabase_migrations.schema_migrations(version,name) values('202610040003','profile_avatar_constraints');\ncommit;",
    ),
    false,
  );
  console.log("Complete avatar shape, raster and size constraints applied and recorded.");
}
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  headers,
});
if (!response.ok) throw new Error(`Auth configuration read failed (${response.status}).`);
let config = await response.json();
if (process.argv[2] === "harden") {
  const updated = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      mailer_autoconfirm: false,
      password_min_length: 8,
      password_required_characters:
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
      site_url: "http://127.0.0.1:4173",
      uri_allow_list:
        "http://127.0.0.1:4173/auth/callback,http://127.0.0.1:4173/auth/callback?next=%2Freset-password",
    }),
  });
  if (!updated.ok) throw new Error(`Auth hardening failed (${updated.status}).`);
  config = await updated.json();
  console.log(
    "Staging confirmation, password policy and exact local-worker redirects updated. Run inspect to verify.",
  );
}
if (process.argv[2] === "require-current-password") {
  const updated = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ security_update_password_require_current_password: true }),
  });
  if (!updated.ok) throw new Error(`Current-password protection failed (${updated.status}).`);
  config = await updated.json();
  console.log(
    "Staging Auth now independently requires the current password outside verified recovery sessions.",
  );
}
// Never print SMTP passwords, CAPTCHA secrets, tokens, or email addresses.
console.log(
  JSON.stringify(
    {
      auth: Object.fromEntries(
        Object.entries(config).filter(([key]) =>
          /^(site_url|uri_allow_list|mailer_autoconfirm|password_min_length|password_required_characters|rate_limit.*|security_captcha_enabled|security_captcha_provider|security_update_password.*|jwt_exp)$/.test(
            key,
          ),
        ),
      ),
      smtpConfigured: Boolean(config.smtp_host && config.smtp_user && config.smtp_pass),
      serviceKeyAvailable: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    },
    null,
    2,
  ),
);
