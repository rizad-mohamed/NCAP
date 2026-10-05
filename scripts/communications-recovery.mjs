import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { readFile, rm } from "node:fs/promises";
const env = loadEnv("development", process.cwd(), "");
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (ref !== "zsaefnfgauqvstptetdw" || !process.argv.includes(`--staging-project=${ref}`))
  throw new Error("Confirmed staging opt-in required.");
async function sql(query, readOnly = false) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ query, read_only: readOnly }),
        signal: AbortSignal.timeout(60000),
      });
      break;
    } catch {
      if (attempt === 2)
        throw new Error("Recovery connection unavailable after three attempts; manifest retained.");
    }
  }
  if (!response.ok) throw new Error(`Recovery query failed (${response.status}).`);
  return response.json();
}
const candidates = await sql(
  "select p.id,p.role,p.created_at from public.profiles p join auth.users u on u.id=p.id where u.email ~ '^ncap-comm-[0-9a-f-]{36}@example[.]invalid$' order by p.created_at",
  true,
);
const sources = await sql(
  "select id,title from public.learning_modules where id like 'm-comm-%' and title like 'Communications QA %'",
  true,
);
console.log(JSON.stringify({ candidates, sources }));
const finish = process.argv.find((arg) => arg.startsWith("--finish="))?.slice(9);
if (finish) {
  if (!/^[0-9a-f-]{36}$/.test(finish)) throw new Error("Invalid recovery suffix.");
  const path = `.qa.local/communications-${finish}.json`;
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (
    manifest.suffix !== finish ||
    manifest.ids.length !== 3 ||
    manifest.ids.some((id) => !/^[0-9a-f-]{36}$/.test(id))
  )
    throw new Error("Invalid recovery manifest.");
  const remaining = candidates.filter((row) => manifest.ids.includes(row.id));
  const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const account of remaining.reverse()) {
    const result = await service.auth.admin.deleteUser(account.id);
    if (result.error)
      throw new Error(
        `Fixture account deletion failed (status=${result.error.status},code=${result.error.code}).`,
      );
  }
  const tables = manifest.baseline.map((row) => row.name);
  if (tables.some((table) => !/^[a-z_]+$/.test(table))) throw new Error("Invalid table names.");
  const after = await sql(
    tables
      .map(
        (table) =>
          `select '${table}' name,count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) digest from public.${table} t`,
      )
      .join(" union all "),
    true,
  );
  if (JSON.stringify(after) !== JSON.stringify(manifest.baseline))
    throw new Error("Recovery did not restore original full-row digests.");
  await rm(path);
  console.log(
    "Interrupted final account cleanup recovered; all 13 full-row digests match original baseline.",
  );
}
const suffix = process.argv.find((arg) => arg.startsWith("--cleanup="))?.slice(10);
if (suffix) {
  if (!/^[0-9a-f-]{36}$/.test(suffix)) throw new Error("Invalid fixture suffix.");
  const ids =
    process.argv
      .find((arg) => arg.startsWith("--accounts="))
      ?.slice(11)
      .split(",") ?? [];
  if (
    ids.length !== 3 ||
    ids.some((id) => !/^[0-9a-f-]{36}$/.test(id) || !candidates.some((row) => row.id === id))
  )
    throw new Error("Three explicit existing disposable account IDs required.");
  const admin = candidates.find((row) => ids.includes(row.id) && row.role === "super_admin");
  const module = `m-comm-${suffix}`,
    lesson = `l-comm-${suffix}`,
    topic = `t-comm-${suffix}`;
  if (
    !admin ||
    !sources.some((row) => row.id === module && row.title === `Communications QA ${suffix}`)
  )
    throw new Error("Fixture ownership/source confirmation failed.");
  const owned = await sql(
    `select actor_id from public.learning_audit where record_id='${module}' and actor_id='${admin.id}'`,
    true,
  );
  if (!owned.length) throw new Error("Source audit does not match explicit fixture administrator.");
  const tables = [
    "profiles",
    "dashboard_announcements",
    "in_app_notifications",
    "announcement_audit",
    "notification_generation_audit",
    "content_translations",
    "content_translation_audit",
    "learning_topics",
    "learning_modules",
    "learning_lessons",
    "awareness_resources",
    "learning_media_assets",
    "awareness_media_assets",
  ];
  const exclusion = [suffix, ...ids]
    .map((id) => `to_jsonb(t)::text not like '%${id}%'`)
    .join(" and ");
  const snapshot = () =>
    sql(
      tables
        .map(
          (table) =>
            `select '${table}' name,count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) digest from public.${table} t where ${exclusion}`,
        )
        .join(" union all "),
      true,
    );
  const baseline = await snapshot();
  const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const bucket of ["awareness-media", "learning-media"]) {
    const assets = await sql(
      `select path from public.${bucket.replace("-", "_")}_assets where uploaded_by='${admin.id}'`,
      true,
    );
    if (
      assets.length &&
      (await service.storage.from(bucket).remove(assets.map((row) => row.path))).error
    )
      throw new Error("Fixture storage cleanup failed.");
  }
  await sql(`begin;
    delete from public.dashboard_announcements where title like 'Communications QA ${suffix}%';
    update public.awareness_media_assets set state='retired' where uploaded_by='${admin.id}';
    delete from public.awareness_resources where created_by='${admin.id}';
    delete from public.learning_lessons where module_id='${module}';
    delete from public.learning_modules where id='${module}';
    delete from public.learning_topics where id='${topic}';
    delete from public.awareness_media_assets where uploaded_by='${admin.id}';
    delete from public.learning_media_assets where uploaded_by='${admin.id}';
    delete from public.announcement_audit where actor_uuid='${admin.id}' or coalesce(before_state->>'title',after_state->>'title') like 'Communications QA ${suffix}%';
    delete from public.content_translation_audit where actor_uuid='${admin.id}' or coalesce(before_state->>'lesson_id',after_state->>'lesson_id')='${lesson}';
    delete from public.notification_generation_audit where user_uuid in (${ids.map((id) => `'${id}'`).join(",")});
    delete from public.learning_audit where actor_id='${admin.id}' or record_id in ('${topic}','${module}','${lesson}');
    delete from public.awareness_audit where actor_id='${admin.id}';
    commit;`);
  for (const id of [...ids].reverse())
    if ((await service.auth.admin.deleteUser(id)).error)
      throw new Error("Fixture account cleanup failed.");
  if (JSON.stringify(await snapshot()) !== JSON.stringify(baseline))
    throw new Error("Non-fixture data changed during recovery.");
  console.log("Interrupted run recovered; all 13 non-fixture table digests unchanged.");
}
