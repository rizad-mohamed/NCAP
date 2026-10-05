import { loadEnv } from "vite";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, rm } from "node:fs/promises";
const env = loadEnv("development", process.cwd(), "");
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (ref !== "zsaefnfgauqvstptetdw" || !process.argv.includes(`--staging-project=${ref}`))
  throw new Error("Explicit confirmed staging opt-in required.");
const browser = process.argv.find((arg) => arg.startsWith("--project=")) ?? "--project=chromium";
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = () =>
  createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
async function sql(query, readOnly = false) {
  let response;
  // These management queries are reads, an idempotent fixture-role update,
  // or exact-ID cleanup. Never retry authored-content creation RPCs here.
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
        throw new Error(
          "Staging connection unavailable after three attempts; recovery manifest retained.",
        );
    }
  }
  if (!response.ok) throw new Error(`Staging request failed (${response.status}).`);
  return response.json();
}
function check(value, message) {
  if (!value) throw new Error(message);
}
async function rpc(db, name, args) {
  const result = await db.rpc(name, args);
  check(!result.error, `Staging RPC failed: ${name} (${result.error?.code ?? "unknown"}).`);
  return result.data;
}
const suffix = randomUUID();
const prefix = `Communications QA ${suffix}`;
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const ids = [];
const topic = `t-comm-${suffix}`,
  module = `m-comm-${suffix}`,
  lesson = `l-comm-${suffix}`;
const awareness = randomUUID();
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
async function snapshot() {
  return sql(
    tables
      .map(
        (table) =>
          `select '${table}' name,count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) digest from public.${table} t`,
      )
      .join(" union all "),
    true,
  );
}
const baseline = await snapshot();
await mkdir(".qa.local", { recursive: true });
const recoveryManifest = `.qa.local/communications-${suffix}.json`;
const recordRecovery = () =>
  writeFile(
    recoveryManifest,
    JSON.stringify({ suffix, ids, topic, module, lesson, awareness, baseline }, null, 2),
  );
await recordRecovery();
async function account(name) {
  const email = `ncap-comm-${randomUUID()}@example.invalid`;
  const result = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  check(!result.error && result.data.user, "Disposable account creation failed.");
  const id = result.data.user.id;
  ids.push(id);
  await recordRecovery();
  const db = client();
  const signed = await db.auth.signInWithPassword({ email, password });
  check(!signed.error, "Disposable sign-in failed.");
  return { id, email, db };
}
let admin;
try {
  admin = await account("Communications QA Admin");
  const alice = await account("Communications QA Learner");
  const bob = await account("Communications QA Other");
  await sql(`update public.profiles set role='super_admin' where id='${admin.id}'`);
  const date = (await sql("select current_date::text as today", true))[0].today;
  await rpc(admin.db, "save_learning_record", {
    kind: "topics",
    payload: { id: topic, name: prefix, slug: `communications-${suffix}`, status: "Active" },
  });
  const moduleRecord = {
    id: module,
    title: prefix,
    description: "Disposable translation source",
    topicId: topic,
    topic: prefix,
    difficulty: "Beginner",
    minutes: 5,
    order: 9999,
    status: "Published",
    objectives: ["Disposable objective"],
    quizId: "",
  };
  await rpc(admin.db, "save_learning_record", { kind: "modules", payload: moduleRecord });
  await rpc(admin.db, "save_learning_record", {
    kind: "lessons",
    payload: {
      ...moduleRecord,
      id: lesson,
      moduleId: module,
      summary: "Disposable lesson source",
      blocks: [{ kind: "paragraph", text: "Disposable source fixture, not educational guidance." }],
    },
  });
  await rpc(admin.db, "save_awareness_resource", {
    payload: {
      id: awareness,
      kind: "cyberTips",
      slug: `comm-${suffix}`,
      title: prefix,
      summary: "Disposable authored source",
      topic: "General",
      language: "en",
      status: "Published",
      display_order: 9999,
      content: {},
      tags: [],
      author: "QA",
      featured: false,
    },
  });
  const notice = {
    title: `${prefix} API`,
    body: "Disposable notice",
    audience: "New Learners",
    active: true,
    startsAt: date,
    endsAt: date,
  };
  await rpc(admin.db, "dashboard_save_announcement", { payload: notice });
  const noticeRow = (
    await sql(`select id from public.dashboard_announcements where title='${notice.title}'`, true)
  )[0];
  check(
    (await alice.db.rpc("dashboard_save_announcement", { payload: notice })).error,
    "Learner announcement mutation was allowed.",
  );
  check(
    (await client().rpc("notifications_list")).error,
    "Anonymous notification RPC was allowed.",
  );
  await rpc(alice.db, "notifications_sync");
  check(
    (await rpc(alice.db, "notifications_sync")) === 0,
    "Duplicate announcement delivery occurred.",
  );
  const notifications = await rpc(alice.db, "notifications_list");
  const own = notifications.items.find((item) => item.title === notice.title);
  check(own, "Audience-targeted notification missing.");
  await rpc(admin.db, "dashboard_save_announcement", {
    payload: { ...notice, id: noticeRow.id, active: false },
  });
  const withdrawn = (await rpc(alice.db, "notifications_list")).items.find(
    (item) => item.id === own.id,
  );
  check(
    withdrawn && !withdrawn.available && !withdrawn.title && !withdrawn.body && !withdrawn.href,
    "Withdrawn announcement snapshot exposed through notification RPC.",
  );
  const hidden = await alice.db.from("in_app_notifications").select("id").eq("id", own.id);
  check(!hidden.error && !hidden.data.length, "Withdrawn announcement bypassed direct-table RLS.");
  await rpc(admin.db, "dashboard_save_announcement", {
    payload: { ...notice, id: noticeRow.id },
  });
  check(
    (await bob.db.rpc("notifications_set_read", { target: own.id, is_read: true })).error,
    "Cross-user read state mutation was allowed.",
  );
  const foreign = await bob.db.from("in_app_notifications").select("id").eq("id", own.id);
  check(!foreign.error && !foreign.data.length, "Cross-user notification content exposed.");
  check(
    (await alice.db.from("in_app_notifications").update({ title: "Injected" }).eq("id", own.id))
      .error,
    "Notification content mutation was allowed.",
  );
  await rpc(alice.db, "notifications_set_read", { target: own.id, is_read: true });
  await rpc(alice.db, "notifications_set_read", { target: own.id, is_read: false });
  const audit = await admin.db
    .from("announcement_audit")
    .select("action,actor_uuid")
    .eq("announcement_id", noticeRow.id);
  check(
    !audit.error &&
      audit.data.some((row) => row.action === "create" && row.actor_uuid === admin.id),
    "Announcement audit missing.",
  );
  check(
    (await alice.db.from("announcement_audit").select("id")).data?.length === 0,
    "Learner audit exposure.",
  );
  const translation = {
    kind: "lessons",
    sourceId: lesson,
    sourceVersion: 1,
    expectedVersion: 0,
    language: "ta",
    status: "Draft",
    content: {
      title: `${prefix} draft`,
      summary: "Draft fixture",
      objectives: ["Fixture objective"],
      blocks: [{ kind: "paragraph", text: "Fixture draft" }],
    },
  };
  await rpc(admin.db, "content_translation_save", { payload: translation });
  check(
    (
      await rpc(alice.db, "content_translation_list", {
        target_kind: "lessons",
        target_ids: [lesson],
        target_language: "ta",
        admin_mode: false,
      })
    ).length === 0,
    "Draft translation exposed.",
  );
  check(
    (await alice.db.rpc("content_translation_save", { payload: translation })).error,
    "Learner translation mutation was allowed.",
  );
  check(
    (
      await alice.db.rpc("content_translation_list", {
        target_kind: "lessons",
        target_ids: [lesson],
        target_language: "ta",
        admin_mode: true,
      })
    ).error,
    "Learner admin translation read was allowed.",
  );
  await rpc(admin.db, "content_translation_save", {
    payload: { ...translation, expectedVersion: 1, status: "Published" },
  });
  check(
    (
      await rpc(alice.db, "content_translation_list", {
        target_kind: "lessons",
        target_ids: [lesson],
        target_language: "ta",
        admin_mode: false,
      })
    ).length === 1,
    "Published translation missing.",
  );
  // Return Tamil to a draft so the browser can exercise fallback.
  await rpc(admin.db, "content_translation_save", {
    payload: { ...translation, expectedVersion: 2, status: "Draft" },
  });
  console.log(
    "PASS hosted RLS: audience/idempotency, owner read-state, anonymous/learner privilege denial, immutable content, audit protection, draft/publication isolation.",
  );
  const childEnv = {
    ...process.env,
    ...env,
    COMMUNICATIONS_E2E: "1",
    E2E_ADMIN_EMAIL: admin.email,
    E2E_ADMIN_PASSWORD: password,
    E2E_LEARNER_EMAIL: alice.email,
    E2E_LEARNER_PASSWORD: password,
    E2E_RUN_ID: suffix,
    E2E_COMM_PREFIX: prefix,
    E2E_COMM_DATE: date,
    E2E_COMM_LESSON_ID: lesson,
    E2E_COMM_LESSON_TITLE: prefix,
  };
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "e2e/communications-live.spec.ts",
        browser,
        "--workers=1",
      ],
      { env: childEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    const secrets = [
      password,
      ...Object.entries(env)
        .filter(([key]) => /SECRET|TOKEN|PASSWORD|SERVICE_ROLE/.test(key))
        .map(([, value]) => value),
    ].filter((value) => value.length > 10);
    for (const stream of [child.stdout, child.stderr]) {
      let pending = "";
      const output = (line) => {
        for (const secret of secrets) line = line.replaceAll(secret, "[redacted]");
        process.stdout.write(line);
      };
      stream.on("data", (chunk) => {
        pending += chunk.toString();
        let end;
        while ((end = pending.indexOf("\n")) >= 0) {
          output(pending.slice(0, end + 1));
          pending = pending.slice(end + 1);
        }
      });
      stream.on("end", () => {
        if (pending) output(pending);
      });
    }
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Browser verification failed (${code}).`)),
    );
  });
  const mutations = await sql(
    `select action from public.announcement_audit where actor_uuid='${admin.id}' and coalesce(after_state->>'title',before_state->>'title')='${prefix} browser'`,
    true,
  );
  check(
    ["create", "edit", "deactivate", "delete"].every((action) =>
      mutations.some((row) => row.action === action),
    ),
    "Browser announcement audit sequence missing.",
  );
  console.log("Browser announcement audit sequence verified on staging.");
} finally {
  if (admin) {
    // Every target is an exact generated owner/resource ID from this run.
    for (const bucket of ["awareness-media", "learning-media"]) {
      const rows = await sql(
        `select path from public.${bucket.replace("-", "_")}_assets where uploaded_by='${admin.id}'`,
        true,
      );
      if (rows.length)
        check(
          !(await service.storage.from(bucket).remove(rows.map((row) => row.path))).error,
          "Disposable storage cleanup failed.",
        );
    }
    await sql(`begin;
   delete from public.dashboard_announcements where title like '${prefix}%';
   update public.awareness_media_assets set state='retired' where uploaded_by='${admin.id}';
   delete from public.awareness_resources where created_by='${admin.id}' or id='${awareness}';
   delete from public.learning_lessons where module_id='${module}';
   delete from public.learning_modules where id='${module}';
   delete from public.learning_topics where id='${topic}';
   delete from public.awareness_media_assets where uploaded_by='${admin.id}';
   delete from public.learning_media_assets where uploaded_by='${admin.id}';
   delete from public.announcement_audit where actor_uuid='${admin.id}';
   delete from public.announcement_audit where coalesce(before_state->>'title',after_state->>'title') like '${prefix}%';
   delete from public.content_translation_audit where actor_uuid='${admin.id}' or coalesce(before_state->>'lesson_id',after_state->>'lesson_id')='${lesson}';
   delete from public.notification_generation_audit where user_uuid in (${ids.map((id) => `'${id}'`).join(",")});
   delete from public.learning_audit where actor_id='${admin.id}' or record_id in ('${topic}','${module}','${lesson}');
   delete from public.awareness_audit where actor_id='${admin.id}';
   commit;`);
  }
  for (const id of [...ids].reverse()) {
    let error;
    for (let attempt = 0; attempt < 3; attempt++) {
      ({ error } = await service.auth.admin.deleteUser(id));
      if (!error) break;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    check(!error, `Disposable account cleanup failed (status=${error?.status}).`);
  }
  const after = await snapshot();
  check(
    JSON.stringify(after) === JSON.stringify(baseline),
    "Staging fixture cleanup digest mismatch; inspect before release.",
  );
  console.log(
    "Disposable accounts, notices, translations, media and audit fixtures removed; 13 table digests match baseline.",
  );
  await rm(recoveryManifest, { force: true });
}
