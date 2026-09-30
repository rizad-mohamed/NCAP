import { readFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line.includes("="))
  .map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; }));
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (!ref || !env.SUPABASE_ACCESS_TOKEN) throw new Error("Supabase project access is unavailable.");
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
async function sql(query, readOnly = true) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  if (!response.ok) throw new Error(`Supabase database request failed (${response.status}).`);
  return response.json();
}
const version = "202609300003";
if (process.argv[2] === "inspect-hook") {
  const hooks = await sql("select rolconfig from pg_roles where rolname='authenticator'");
  console.log(JSON.stringify(hooks));
}
if (process.argv[2] === "live-check") {
  await sql(`begin;
    do $verify$ declare admin_id uuid; learner_id uuid; payload jsonb; before_audit bigint;
    begin
      select id into admin_id from public.profiles where role='super_admin' and status='active' limit 1;
      select id into learner_id from public.profiles where role='learner' and status='active' limit 1;
      if admin_id is null then raise exception 'No active Super Admin exists'; end if;
      perform set_config('request.jwt.claim.sub',admin_id::text,true);
      perform set_config('request.jwt.claim.role','authenticated',true);
      payload:=public.admin_users_list(0,1,'','','','created','desc');
      if payload is null or payload->'items' is null then raise exception 'Admin listing failed'; end if;
      if learner_id is not null then
        payload:=public.admin_user_details(learner_id);
        if payload->>'id' is distinct from learner_id::text then raise exception 'Admin details failed'; end if;
        select count(*) into before_audit from public.admin_user_audit;
        perform public.admin_user_change(learner_id,null,'suspended','transactional live verification');
        if not exists(select 1 from public.admin_user_audit where target_id=learner_id and action='suspended') or
          (select count(*) from public.admin_user_audit)<=before_audit or
          not exists(select 1 from auth.users where id=learner_id and banned_until>now()) then
          raise exception 'Status or audit verification failed';
        end if;
        perform set_config('request.jwt.claim.sub',learner_id::text,true);
        begin perform private.check_active_account_request(); raise exception 'Suspended request was allowed';
        exception when insufficient_privilege then null; end;
        begin perform public.admin_users_list(); raise exception 'Learner listing was allowed';
        exception when insufficient_privilege then null; end;
      end if;
    end $verify$;
    rollback;`, false);
  console.log("Live admin/learner RPC, status, ban and audit checks passed inside a rolled-back transaction.");
}
const history = await sql(`select version from supabase_migrations.schema_migrations where version in ('202609300001','202609300002','${version}','202609300004') order by version`);
const object = await sql("select to_regclass('public.admin_user_audit') as audit, exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='status') as status_column");
const trigram = await sql("select extnamespace::regnamespace::text as schema from pg_extension where extname='pg_trgm'");
console.log(JSON.stringify({ project: ref, recorded: history.map((r) => r.version), objects: object[0], trigramSchema: trigram[0]?.schema ?? null }));
if (process.argv[2] === "apply") {
  if (!history.some((r) => r.version === "202609300001") || !history.some((r) => r.version === "202609300002") ||
    history.some((r) => r.version === version) || object[0]?.audit || object[0]?.status_column)
    throw new Error("Migration preconditions failed; inspect remote state.");
  const file = await readFile(new URL("../supabase/migrations/202609300003_admin_users.sql", import.meta.url), "utf8");
  if (!/\bcommit;\s*$/i.test(file)) throw new Error("Migration is missing its transaction boundary.");
  await sql(file.replace(/\bcommit;\s*$/i,
    `insert into supabase_migrations.schema_migrations(version,name) values ('${version}','admin_users');\ncommit;`), false);
  console.log("Users migration applied and recorded.");
}
if (process.argv[2] === "apply-guard") {
  const hooks = await sql("select rolconfig from pg_roles where rolname='authenticator'");
  if (!history.some((r) => r.version === version) || history.some((r) => r.version === "202609300004") ||
    hooks[0]?.rolconfig?.some((entry) => entry.startsWith("pgrst.db_pre_request=")))
    throw new Error("Request guard preconditions failed; inspect remote state.");
  const file = await readFile(new URL("../supabase/migrations/202609300004_admin_users_request_guard.sql", import.meta.url), "utf8");
  await sql(file.replace(/\bcommit;\s*$/i,
    "insert into supabase_migrations.schema_migrations(version,name) values ('202609300004','admin_users_request_guard');\ncommit;"), false);
  console.log("Users request guard applied and recorded.");
}
if (["verify", "apply", "apply-guard"].includes(process.argv[2])) {
  const rows = await sql("select p.relname,p.relrowsecurity from pg_class p where p.relnamespace='public'::regnamespace and p.relname in ('profiles','admin_user_audit') order by p.relname");
  if (rows.length !== 2 || rows.some((r) => !r.relrowsecurity)) throw new Error("Users RLS verification failed.");
  if (process.argv[2] === "apply-guard" || process.argv[2] === "verify") {
    const hooks = await sql("select rolconfig from pg_roles where rolname='authenticator'");
    if (!hooks[0]?.rolconfig?.includes("pgrst.db_pre_request=private.check_active_account_request"))
      throw new Error("Users request guard is not configured.");
  }
  for (const name of ["admin_users_list", "admin_user_details", "admin_user_change"]) {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST", headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`, "content-type": "application/json" },
      body: name === "admin_user_details" ? JSON.stringify({ target: "00000000-0000-4000-8000-000000000000" }) :
        name === "admin_user_change" ? JSON.stringify({ target: "00000000-0000-4000-8000-000000000000", new_role: "learner" }) : "{}",
    });
    if (response.ok) throw new Error(`Anonymous ${name} unexpectedly succeeded.`);
    console.log(`Anonymous ${name}: denied (${response.status})`);
  }
  console.log("Live Users schema and anonymous access checks passed.");
}
