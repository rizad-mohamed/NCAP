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
async function sql(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, read_only: true }),
  });
  if (!response.ok) throw new Error(`Read-only staging review failed (${response.status}).`);
  return response.json();
}
const tables = await sql(`select c.relname as name,c.relrowsecurity as rls,
  (select count(*)::integer from pg_policy p where p.polrelid=c.oid) as policies
  from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'
  and (c.relname ~ '^(awareness_|learning_|quiz_|dashboard_|certificate)' or c.relname in ('profiles','admin_user_audit','announcement_audit','in_app_notifications','notification_generation_audit','content_translations','content_translation_audit')) order by c.relname`);
const unsafe =
  await sql(`select n.nspname as schema,p.proname as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prosecdef and not exists(select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%')`);
const buckets = await sql(
  "select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('awareness-media','learning-media') order by id",
);
const orphans =
  await sql(`select 'learning lesson parents' as relationship,count(*)::integer as orphans from public.learning_lessons l left join public.learning_modules m on m.id=l.module_id where m.id is null
  union all select 'quiz module parents',count(*)::integer from public.quiz_definitions q left join public.learning_modules m on m.id=q.module_id where m.id is null
  union all select 'certificate learner parents',count(*)::integer from public.certificates c left join public.profiles p on p.id=c.user_id where p.id is null`);
console.log(
  JSON.stringify({ tables, securityDefinersWithoutSearchPath: unsafe, buckets, orphans }, null, 2),
);
if (
  tables.some((table) => !table.rls) ||
  unsafe.length ||
  buckets.length !== 2 ||
  buckets.some((bucket) => bucket.public) ||
  orphans.some((row) => row.orphans)
)
  throw new Error("A database/storage security or integrity gate failed.");
console.log(
  "All reviewed staging application tables use RLS, definer paths are set, media buckets are private and checked relationships have no orphans.",
);
