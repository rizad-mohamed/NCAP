import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
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
for (const name of [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
])
  if (!env[name]) throw new Error(`Missing ${name}.`);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
const stagingFlag = `--staging-project=${ref}`;
if (!process.argv.slice(2).includes(stagingFlag))
  throw new Error(
    "Provide the explicit staging project reference before running disposable authenticated tests.",
  );
const recoverySuffix = process.argv.find((arg) => arg.startsWith("--recover="))?.slice(10);
if (recoverySuffix && !/^[a-f0-9]{8}$/.test(recoverySuffix))
  throw new Error("Invalid recovery suffix.");
const recovery = recoverySuffix
  ? JSON.parse(await readFile(`.qa.local/fixture-${recoverySuffix}.json`, "utf8"))
  : null;
if (
  recovery &&
  (recovery.suffix !== recoverySuffix ||
    [recovery.adminId, recovery.learnerId, recovery.outsiderId].some(
      (id) => !/^[0-9a-f-]{36}$/.test(id),
    ))
)
  throw new Error("Invalid recovery manifest.");
const playwrightArgs = process.argv
  .slice(2)
  .filter((arg) => arg !== stagingFlag && !arg.startsWith("--recover="));
if (playwrightArgs.filter((arg) => arg.startsWith("--project")).length > 1)
  throw new Error(
    "Run one browser profile per invocation so every profile receives fresh disposable fixtures.",
  );
const management = `https://api.supabase.com/v1/projects/${ref}/database/query`;
async function sql(query, readOnly = false) {
  const response = await fetch(management, {
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
function run(command, args, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}.`)),
    );
  });
}
const suffix = recoverySuffix ?? randomUUID().slice(0, 8);
const adminEmail = `ncap-admin-modules-admin-${suffix}@example.invalid`;
const learnerEmail = `ncap-admin-modules-learner-${suffix}@example.invalid`;
const outsiderEmail = `ncap-admin-modules-outsider-${suffix}@example.invalid`;
const adminPassword = `${randomBytes(24).toString("base64url")}aA1!`;
const learnerPassword = `${randomBytes(24).toString("base64url")}aA1!`;
const outsiderPassword = `${randomBytes(24).toString("base64url")}aA1!`;
const topicId = `t-live-${suffix}`;
const moduleId = `m-live-${suffix}`;
const lessonId = `l-live-${suffix}`;
const quizId = `q-live-${suffix}`;
const moduleTitle = `Live certificate module ${suffix}`;
const quizTitle = `Live assessment ${suffix}`;
const learnerName = `Live Learner ${suffix} පරිශීලක தமிழ்`;
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let adminId = recovery?.adminId;
let learnerId = recovery?.learnerId;
let outsiderId = recovery?.outsiderId;
async function retryCleanup(operation) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await operation();
      if (!result.error) return result;
    } catch {
      /* Preserve the manifest if the final attempt fails. */
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Disposable cleanup request failed after three attempts.");
}
const integrityTables = [
  "awareness_resources",
  "learning_topics",
  "learning_modules",
  "learning_lessons",
  "quiz_definitions",
  "quiz_questions",
  "quiz_options",
  "learning_completions",
  "learning_bookmarks",
  "quiz_attempts",
  "certificates",
  "dashboard_announcements",
  "announcement_audit",
  "in_app_notifications",
  "notification_generation_audit",
  "content_translations",
  "content_translation_audit",
];
async function integritySnapshot() {
  return sql(
    integrityTables
      .map(
        (table) =>
          `select '${table}' as name,count(*)::integer as count,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) as digest from public.${table} t`,
      )
      .join(" union all "),
    true,
  );
}
const baselineData = recovery?.baselineData ?? (await integritySnapshot());
if (recovery) {
  for (const [id, expected] of [
    [adminId, adminEmail],
    [learnerId, learnerEmail],
    [outsiderId, outsiderEmail],
  ]) {
    const result = await service.auth.admin.getUserById(id);
    if (result.error || result.data.user.email !== expected)
      throw new Error("Recovery account ownership confirmation failed.");
  }
}
try {
  if (!recovery) {
    const adminCreated = await service.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { display_name: `Live Admin ${suffix}` },
    });
    if (adminCreated.error || !adminCreated.data.user)
      throw new Error(
        `Disposable administrator creation failed (${adminCreated.error?.status ?? "unknown"}, ${adminCreated.error?.code ?? "unknown"}).`,
      );
    adminId = adminCreated.data.user.id;
    const learnerCreated = await service.auth.admin.createUser({
      email: learnerEmail,
      password: learnerPassword,
      email_confirm: true,
      user_metadata: { display_name: learnerName },
    });
    if (learnerCreated.error || !learnerCreated.data.user)
      throw new Error(
        `Disposable learner creation failed (${learnerCreated.error?.status ?? "unknown"}, ${learnerCreated.error?.code ?? "unknown"}).`,
      );
    learnerId = learnerCreated.data.user.id;
    const outsiderCreated = await service.auth.admin.createUser({
      email: outsiderEmail,
      password: outsiderPassword,
      email_confirm: true,
      user_metadata: { display_name: `Privacy Learner ${suffix}` },
    });
    if (outsiderCreated.error || !outsiderCreated.data.user)
      throw new Error("Disposable privacy learner creation failed.");
    outsiderId = outsiderCreated.data.user.id;
    await sql(`begin;
    update public.profiles set role='super_admin' where id='${adminId}';
    insert into public.learning_topics(id,name,slug,status) values('${topicId}','Live Safety ${suffix}','live-safety-${suffix}','Active');
    insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status,quiz_id)
      values('${moduleId}','${topicId}','${moduleTitle}','Disposable staging verification','Beginner',10,9900,'Published','${quizId}');
    insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status)
      values('${lessonId}','${moduleId}','${topicId}','Eligibility lesson ${suffix}','Disposable eligibility evidence','Beginner',10,1,'Published');
    insert into public.learning_module_objectives(module_id,position,text) values('${moduleId}',1,'Learn safely');
    insert into public.learning_lesson_objectives(lesson_id,position,text) values('${lessonId}',1,'Choose safe actions');
    insert into public.learning_lesson_blocks(lesson_id,position,content) values('${lessonId}',1,'{"kind":"paragraph","text":"Disposable staging lesson content."}');
    insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,passing_percent,eligibility_percent,question_count,status)
      values('${quizId}','${moduleId}','${quizTitle}','live-assessment-${suffix}','Disposable assessment','Live Safety','Beginner',70,80,1,'Published');
    insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,explanation,status)
      values('qn-live-${suffix}','${quizId}','Which action protects your account?','Live Safety','Beginner','Use a unique passphrase.','Published');
    insert into public.quiz_options(question_id,position,answer_text,is_correct) values
      ('qn-live-${suffix}',0,'Use a unique passphrase',true),
      ('qn-live-${suffix}',1,'Share your password',false);
    insert into public.learning_completions(user_id,lesson_id,completed_at) values('${learnerId}','${lessonId}',now()-interval '1 day');
    insert into public.quiz_attempts(user_id,quiz_id,attempt_number,started_at,deadline_at,completed_at,status,correct_count,total_count,score_percent,passed)
      values('${learnerId}','${quizId}',1,now()-interval '2 days',now()-interval '2 days'+interval '10 minutes',now()-interval '2 days'+interval '5 minutes','submitted',9,10,90,true);
    commit;`);

    const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const learnerClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const outsiderClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (
      (
        await outsiderClient.auth.signInWithPassword({
          email: outsiderEmail,
          password: outsiderPassword,
        })
      ).error
    )
      throw new Error("Disposable privacy learner sign-in failed.");
    if (
      (await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword }))
        .error
    )
      throw new Error("Disposable administrator sign-in failed.");
    if (
      (
        await learnerClient.auth.signInWithPassword({
          email: learnerEmail,
          password: learnerPassword,
        })
      ).error
    )
      throw new Error("Disposable learner sign-in failed.");
    const progress = await learnerClient.rpc("dashboard_learner", { activity_offset: 0 });
    const isolated = await outsiderClient.rpc("dashboard_learner", { activity_offset: 0 });
    if (
      progress.error ||
      progress.data?.statistics?.completedCount !== 1 ||
      isolated.error ||
      isolated.data?.statistics?.completedCount !== 0
    )
      throw new Error("Live Dashboard progress or cross-user isolation failed.");
    for (const name of ["dashboard_admin", "admin_users_list", "dashboard_announcements_admin"]) {
      if (!(await learnerClient.rpc(name)).error)
        throw new Error(`Learner unexpectedly accessed ${name}.`);
    }
    for (const table of ["quiz_options", "quiz_attempt_items"]) {
      if (!(await learnerClient.from(table).select("*").limit(1)).error)
        throw new Error("Learner unexpectedly read private quiz answer/snapshot tables.");
    }
    if (
      !(await learnerClient.from("profiles").update({ role: "super_admin" }).eq("id", learnerId))
        .error
    )
      throw new Error("Learner unexpectedly changed their own administrator role.");
    const userPage = await adminClient.rpc("admin_users_list", {
      page_offset: 0,
      page_limit: 1,
      search_text: suffix,
      sort_field: "email",
      sort_direction: "asc",
    });
    const nextUserPage = await adminClient.rpc("admin_users_list", {
      page_offset: 1,
      page_limit: 1,
      search_text: suffix,
      sort_field: "email",
      sort_direction: "asc",
    });
    if (
      userPage.error ||
      nextUserPage.error ||
      userPage.data?.total !== 3 ||
      userPage.data?.items?.length !== 1 ||
      nextUserPage.data?.items?.length !== 1 ||
      userPage.data.items[0].id === nextUserPage.data.items[0].id
    )
      throw new Error("Live administrator user search, sorting or pagination failed.");
    if (
      !(
        await adminClient.rpc("admin_user_change", {
          target: adminId,
          new_role: "learner",
          new_status: null,
          reason: "Forged self-demotion",
        })
      ).error
    )
      throw new Error("Administrator unexpectedly changed their own access.");
    if (
      !(
        await learnerClient.rpc("certificate_issue", {
          learner: learnerId,
          module_target: moduleId,
        })
      ).error
    )
      throw new Error("Learner unexpectedly issued a certificate.");
    if (
      !(
        await learnerClient.rpc("admin_content_report", {
          days: 30,
          module_filter: moduleId,
          quiz_filter: quizId,
          page_offset: 0,
        })
      ).error
    )
      throw new Error("Learner unexpectedly accessed administrator reports.");
    const report = await adminClient.rpc("admin_content_report", {
      days: 30,
      module_filter: moduleId,
      quiz_filter: quizId,
      page_offset: 0,
    });
    if (report.error || report.data?.attemptCount !== 1 || report.data?.averageScore !== 90)
      throw new Error("Live authoritative report verification failed.");
    const concurrentEdit = sql(`begin; set local application_name='ncap-live-edit-${suffix}';
    select pg_advisory_xact_lock(726021);
    do $wait$ declare deadline timestamptz:=clock_timestamp()+interval '30 seconds'; begin
      loop
        exit when exists(select 1 from pg_locks where locktype='advisory' and objid=726021 and not granted and pid<>pg_backend_pid());
        if clock_timestamp()>deadline then raise exception 'Concurrent issuance was not observed'; end if;
        perform pg_sleep(0.05);
      end loop;
    end $wait$;
    update public.learning_modules set description=description where id='${moduleId}'; commit;`).then(
      () => ({ ok: true }),
      () => ({ ok: false }),
    );
    let editLockObserved = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const locks = await sql(
        `select exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid
        where l.locktype='advisory' and l.objid=726021 and l.granted and a.application_name='ncap-live-edit-${suffix}') as locked`,
        true,
      );
      if (locks[0]?.locked) {
        editLockObserved = true;
        break;
      }
    }
    if (!editLockObserved) {
      await concurrentEdit;
      throw new Error("Concurrent content-edit lock could not be observed.");
    }
    const issued = await adminClient.rpc("certificate_issue", {
      learner: learnerId,
      module_target: moduleId,
    });
    if (!(await concurrentEdit).ok)
      throw new Error("Concurrent certificate issuance/content edit failed.");
    if (issued.error || !issued.data?.reference)
      throw new Error("Live certificate issuance failed.");
    console.log("Concurrent content edit and certificate issuance completed without deadlock.");
    const duplicate = await adminClient.rpc("certificate_issue", {
      learner: learnerId,
      module_target: moduleId,
    });
    if (duplicate.error || duplicate.data?.id !== issued.data.id)
      throw new Error("Duplicate issuance protection failed.");
    const own = await learnerClient.rpc("certificate_document", { target: issued.data.id });
    if (own.error || own.data?.user_id !== learnerId)
      throw new Error("Learner certificate ownership failed.");
    if (!(await outsiderClient.rpc("certificate_document", { target: issued.data.id })).error)
      throw new Error("Another learner unexpectedly accessed the certificate.");
    const privateRows = await outsiderClient
      .from("certificates")
      .select("id")
      .eq("id", issued.data.id);
    if (privateRows.error || privateRows.data.length)
      throw new Error("Certificate RLS ownership failed.");
    if (
      !(
        await learnerClient.rpc("certificate_revoke", {
          target: issued.data.id,
          reason: "Forged revocation",
        })
      ).error
    )
      throw new Error("Learner unexpectedly revoked a certificate.");
    if (
      !(
        await learnerClient
          .from("certificates")
          .update({ evidence: { eligible: true, learnerName: "Forged" } })
          .eq("id", issued.data.id)
      ).error
    )
      throw new Error("Learner unexpectedly changed certificate facts.");
    const auditRows = await learnerClient.from("certificate_audit").select("id");
    if (auditRows.error || auditRows.data.length)
      throw new Error("Certificate audit privacy failed.");
    if (
      !(
        await learnerClient.rpc("admin_content_report_export", {
          days: 30,
          module_filter: moduleId,
          quiz_filter: quizId,
        })
      ).error
    )
      throw new Error("Learner unexpectedly exported administrator reports.");
    const revoked = await adminClient.rpc("certificate_revoke", {
      target: issued.data.id,
      reason: "Disposable API verification",
    });
    if (revoked.error || revoked.data?.status !== "Revoked")
      throw new Error("Certificate revocation failed.");
    const publicCheck = await anon.rpc("certificate_verify", {
      certificate_reference: issued.data.reference,
    });
    if (publicCheck.error || publicCheck.data?.valid !== false || "learnerName" in publicCheck.data)
      throw new Error("Safe public verification failed.");
    await sql(
      `delete from public.certificate_audit where certificate_id='${issued.data.id}'; delete from public.certificates where id='${issued.data.id}';`,
    );
    console.log(
      "Live administrator/learner RPC, eligibility, report, issuance, duplicate, revocation and privacy checks passed.",
    );

    const testEnv = {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
      ADMIN_MODULES_E2E: "1",
      AWARENESS_INTEGRATION: "1",
      AWARENESS_E2E: "1",
      LEARNING_E2E: "1",
      AWARENESS_VIDEO_FIXTURE: process.env.AWARENESS_VIDEO_FIXTURE || ".qa.local/awareness.webm",
      E2E_ADMIN_EMAIL: adminEmail,
      E2E_ADMIN_PASSWORD: adminPassword,
      E2E_LEARNER_EMAIL: learnerEmail,
      E2E_LEARNER_PASSWORD: learnerPassword,
      E2E_MODULE_ID: moduleId,
      E2E_MODULE_TITLE: moduleTitle,
      E2E_QUIZ_TITLE: quizTitle,
      E2E_LEARNER_NAME: learnerName,
      E2E_LESSON_ID: lessonId,
      E2E_QUIZ_ID: quizId,
      E2E_SECOND_EMAIL: outsiderEmail,
      E2E_SECOND_PASSWORD: outsiderPassword,
      E2E_RUN_ID: suffix,
    };
    await run(
      process.execPath,
      ["node_modules/vitest/vitest.mjs", "run", "src/server/awareness/rls.integration.test.ts"],
      testEnv,
    );
    await run(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "e2e/admin-modules-live.spec.ts",
        "e2e/full-stack-live.spec.ts",
        "e2e/awareness-backend.spec.ts",
        "e2e/learning-media.spec.ts",
        ...(playwrightArgs.some((arg) => arg.startsWith("--project"))
          ? []
          : ["--project=chromium"]),
        ...playwrightArgs,
      ],
      testEnv,
    );
    console.log("Selected authenticated administrator and learner browser workflows passed.");
    if (!playwrightArgs.some((arg) => arg.startsWith("--grep"))) {
      const accountAudit = await sql(
        `select action from public.admin_user_audit where actor_id='${adminId}' and target_id='${outsiderId}' order by id`,
        true,
      );
      if (
        JSON.stringify(accountAudit.map((row) => row.action)) !==
        JSON.stringify([
          "role_changed",
          "role_changed",
          "suspended",
          "restored",
          "disabled",
          "activated",
        ])
      )
        throw new Error("Administrator account-management audit sequence failed.");
      console.log("All six administrator account-management changes have matching audit events.");
    }
    if (process.env.NCAP_LIGHTHOUSE === "1")
      await run(process.execPath, ["scripts/lighthouse-review.mjs"], testEnv);
  }
} finally {
  const cleanupErrors = [];
  await mkdir(".qa.local", { recursive: true });
  const recoveryManifest = `.qa.local/fixture-${suffix}.json`;
  await writeFile(
    recoveryManifest,
    JSON.stringify({ suffix, adminId, learnerId, outsiderId, baselineData }, null, 2),
  );
  try {
    if (adminId && learnerId) {
      const assets = await sql(
        `select path from public.awareness_media_assets where uploaded_by='${adminId}'`,
        true,
      );
      if (
        assets.length &&
        (
          await retryCleanup(() =>
            service.storage.from("awareness-media").remove(assets.map((asset) => asset.path)),
          )
        ).error
      )
        throw new Error("Disposable media cleanup failed.");
      const learningAssets = await sql(
        `select path from public.learning_media_assets where uploaded_by='${adminId}'`,
        true,
      );
      if (
        learningAssets.length &&
        (
          await retryCleanup(() =>
            service.storage
              .from("learning-media")
              .remove(learningAssets.map((asset) => asset.path)),
          )
        ).error
      )
        throw new Error("Disposable Learning media cleanup failed.");
      await sql(`begin;
      delete from public.certificate_audit where certificate_id in (select id from public.certificates where user_id='${learnerId}' or issued_by='${adminId}');
      delete from public.certificates where user_id='${learnerId}' or issued_by='${adminId}';
      delete from public.quiz_attempts where user_id='${learnerId}' or quiz_id='${quizId}';
      delete from public.quiz_questions where quiz_id='${quizId}';
      delete from public.quiz_definitions where id='${quizId}';
      delete from public.learning_completions where user_id='${learnerId}' or lesson_id in (select id from public.learning_lessons where module_id='${moduleId}');
      delete from public.learning_lessons where module_id='${moduleId}';
      delete from public.learning_modules where id='${moduleId}';
      delete from public.learning_modules where title='Learning image verification ${suffix}';
      delete from public.learning_topics where id='${topicId}';
      -- Preserve the active-resource constraint when a failed test leaves media attached.
      update public.awareness_media_assets set state='retired',updated_at=now() where uploaded_by='${adminId}';
      delete from public.awareness_resources where created_by='${adminId}';
      delete from public.awareness_media_assets where uploaded_by='${adminId}';
      delete from public.learning_media_assets where uploaded_by='${adminId}';
      delete from public.awareness_audit where actor_id='${adminId}' or before_data->>'created_by'='${adminId}' or after_data->>'created_by'='${adminId}';
      delete from public.learning_audit where actor_id='${adminId}';
      delete from public.quiz_audit where actor_id='${adminId}';
      delete from public.admin_user_audit where actor_id='${adminId}' or target_id in ('${learnerId}','${outsiderId}');
      delete from public.notification_generation_audit where user_uuid::text in ('${adminId}','${learnerId}','${outsiderId}');
      -- Remove only this run's direct-SQL audit fixtures; preserve earlier history.
      delete from public.learning_audit a where actor_id is null and kind='lessons'
        and coalesce(after_data->>'moduleId',before_data->>'moduleId')='${moduleId}'
        and not exists(select 1 from public.learning_modules m where m.id=coalesce(a.after_data->>'moduleId',a.before_data->>'moduleId'));
      delete from public.quiz_audit a where actor_id is null and record_type='question'
        and coalesce(after_data->>'quiz_id',before_data->>'quiz_id')='${quizId}'
        and not exists(select 1 from public.quiz_definitions q where q.id=coalesce(a.after_data->>'quiz_id',a.before_data->>'quiz_id'));
      commit;`);
    }
  } catch (error) {
    // sql() only exposes HTTP status, never query text or credentials.
    console.error(error instanceof Error ? error.message : "Disposable cleanup request failed.");
    cleanupErrors.push("Disposable staging record cleanup failed.");
  }
  // Keep ownership intact and retain the identifier-only manifest if record
  // cleanup fails; deleting the administrator would erase fixture ownership.
  if (cleanupErrors.length) throw new Error(cleanupErrors.join(" "));
  for (const [id, role] of [
    [outsiderId, "privacy learner"],
    [learnerId, "learner"],
    [adminId, "administrator"],
  ]) {
    if (!id) continue;
    try {
      if ((await retryCleanup(() => service.auth.admin.deleteUser(id))).error)
        cleanupErrors.push(`Disposable ${role} cleanup failed.`);
    } catch {
      cleanupErrors.push(`Disposable ${role} cleanup failed.`);
    }
  }
  if (cleanupErrors.length) throw new Error(cleanupErrors.join(" "));
  if (JSON.stringify(await integritySnapshot()) !== JSON.stringify(baselineData))
    throw new Error(
      "Staging content/progress integrity differs from the baseline after cleanup; investigate before release.",
    );
  await rm(recoveryManifest, { force: true });
  if (adminId || learnerId)
    console.log(
      `Disposable staging accounts, content, activity and certificates removed; all ${integrityTables.length} content/progress table digests match the baseline.`,
    );
}
