import { readFile } from "node:fs/promises";

const entries = (await readFile(new URL("../.env.local", import.meta.url), "utf8"))
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
  });
const env = Object.fromEntries(entries);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (!env.SUPABASE_ACCESS_TOKEN) throw new Error("Supabase management access is unavailable.");
export async function sql(query, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  if (!response.ok) throw new Error(`Staging database request failed (${response.status}).`);
  return response.json();
}
const migrations = [
  "202610030001_certificates",
  "202610030002_admin_reports",
  "202610030003_public_request_guard",
  "202610030004_admin_content_audit",
  "202610030005_publication_eligibility",
  "202610030006_certificate_lock_order",
  "202610030007_maintenance_request_permissions",
];
const mode = process.argv[2] ?? "inspect";
const history = await sql(
  "select version,name from supabase_migrations.schema_migrations order by version",
);
if (!history.some((row) => row.version === "202609300004"))
  throw new Error("Required deployed dependencies are missing.");
console.log(`Configured project: ${ref}; dependencies recorded; mode=${mode}`);
if (mode === "apply") {
  if (process.argv[3] !== `--staging-project=${ref}`)
    throw new Error("Provide the explicit staging project reference to apply migrations.");
  for (const migration of migrations) {
    const version = migration.split("_")[0];
    if (history.some((row) => row.version === version)) {
      console.log(`${migration}: already recorded; skipped`);
      continue;
    }
    const query = await readFile(
      new URL(`../supabase/migrations/${migration}.sql`, import.meta.url),
      "utf8",
    );
    if (!/\bcommit;\s*$/i.test(query))
      throw new Error("Migration is missing transaction boundary.");
    await sql(
      query.replace(
        /\bcommit;\s*$/i,
        `insert into supabase_migrations.schema_migrations(version,name) values('${version}','${migration.slice(13)}');\ncommit;`,
      ),
      false,
    );
    console.log(`${migration}: applied and recorded`);
  }
}
const recorded = await sql(
  "select version from supabase_migrations.schema_migrations where version in ('202610030001','202610030002','202610030003','202610030004','202610030005','202610030006','202610030007') order by version",
);
const tables = await sql(
  "select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in ('certificates','certificate_audit','certificate_templates','awareness_audit')",
);
console.log(JSON.stringify({ recorded: recorded.map((r) => r.version), tables }));
if (["apply", "verify"].includes(mode)) {
  if (recorded.length !== 7 || tables.length !== 4 || tables.some((row) => !row.relrowsecurity))
    throw new Error("Migration/RLS verification failed.");
  const maintenance =
    await sql(`select has_schema_privilege('service_role','private','USAGE') schema_usage,
    has_function_privilege('service_role','private.check_active_account_request()','EXECUTE') guard_execute`);
  if (!maintenance[0]?.schema_usage || !maintenance[0]?.guard_execute)
    throw new Error("Operator maintenance request permissions are missing.");
  const functions = await sql(`select p.proname,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'execute') anon_execute,
    has_function_privilege('authenticated',p.oid,'execute') authenticated_execute
    from pg_proc p where p.pronamespace='public'::regnamespace and (p.proname like 'certificate_%' or p.proname like 'admin_content_report%')`);
  if (
    functions.length !== 9 ||
    functions.some(
      (row) =>
        !row.prosecdef ||
        !row.proconfig?.includes('search_path=""') ||
        !row.authenticated_execute ||
        (row.anon_execute && row.proname !== "certificate_verify"),
    )
  )
    throw new Error("Function permissions verification failed.");
  const grants = await sql(`select table_name,
    has_table_privilege('authenticated','public.'||table_name,'select') can_select,
    has_table_privilege('authenticated','public.'||table_name,'insert,update,delete') can_mutate
    from (values('certificates'),('certificate_audit'),('certificate_templates'),('awareness_audit')) t(table_name)`);
  if (grants.length !== 4 || grants.some((row) => !row.can_select || row.can_mutate))
    throw new Error("Least privilege grants verification failed.");
  const indexes = await sql(
    "select indexname from pg_indexes where schemaname='public' and (tablename in ('certificates','certificate_templates','certificate_audit','awareness_audit') or indexname in ('quiz_attempts_report','learning_completions_report','dashboard_sessions_report')) order by indexname",
  );
  const constraints = await sql(
    "select c.conname from pg_constraint c where c.conrelid in ('public.certificates'::regclass,'public.certificate_templates'::regclass,'public.certificate_audit'::regclass,'public.awareness_audit'::regclass)",
  );
  const auditTrigger = await sql(`select p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'execute') anon_execute,
    has_function_privilege('authenticated',p.oid,'execute') authenticated_execute
    from pg_proc p where p.oid='private.audit_awareness_resource()'::regprocedure
    and exists(select 1 from pg_trigger t where t.tgfoid=p.oid and t.tgrelid='public.awareness_resources'::regclass and not t.tgisinternal)`);
  if (
    auditTrigger.length !== 1 ||
    !auditTrigger[0].prosecdef ||
    !auditTrigger[0].proconfig?.includes('search_path=""') ||
    auditTrigger[0].anon_execute ||
    auditTrigger[0].authenticated_execute
  )
    throw new Error("Awareness audit trigger permissions verification failed.");
  console.log(
    `Verified ${functions.length} secure functions, ${grants.length} SELECT grants, ${indexes.length} indexes, ${constraints.length} constraints.`,
  );
  for (const name of [
    "certificate_registry",
    "certificate_issue",
    "certificate_revoke",
    "certificate_document",
    "certificate_template_get",
    "certificate_template_save",
    "admin_content_report",
    "admin_content_report_export",
  ]) {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    if (response.ok) throw new Error(`Anonymous ${name} unexpectedly succeeded.`);
    console.log(`Anonymous ${name}: denied (${response.status})`);
  }
  const verification = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/certificate_verify`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ certificate_reference: "00000000-0000-4000-8000-000000000000" }),
  });
  const verificationBody = await verification.text();
  let verificationResult;
  try {
    verificationResult = JSON.parse(verificationBody);
  } catch {
    verificationResult = null;
  }
  if (!verification.ok || verificationResult?.valid !== false)
    throw new Error(
      `Public verification contract failed (${verification.status}): ${verificationBody.slice(0, 200)}`,
    );
  console.log("Live schema, security permissions and anonymous verification passed.");
}
