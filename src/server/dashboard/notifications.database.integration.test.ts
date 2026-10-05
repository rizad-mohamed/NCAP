// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";

const admin = "00000000-0000-4000-8000-000000000001";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
let db: PGlite;
async function as(user: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.exec(user ? "set role authenticated" : "set role anon");
}
async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await db.exec("savepoint notification_statement");
  try {
    const rows = (await db.query<T>(sql, params)).rows;
    await db.exec("release savepoint notification_statement");
    return rows;
  } catch (error) {
    await db.exec(
      "rollback to savepoint notification_statement; release savepoint notification_statement",
    );
    throw error;
  }
}
async function notice(
  audience = "All Learners",
  start = "current_date",
  end = "current_date",
  active = true,
) {
  await as(admin);
  return (
    await query<{ id: string }>(
      `insert into public.dashboard_announcements(title,body,audience,active,starts_at,ends_at) values('Notice','Safe plain text',$1,$2,${start},${end}) returning id`,
      [audience, active],
    )
  )[0]!.id;
}
// Fixture insertion uses the database owner; product mutation permissions remain unchanged.
async function seedNotice(
  audience = "All Learners",
  start = "current_date",
  end = "current_date",
  active = true,
) {
  await as(admin);
  await db.exec("reset role");
  return (
    await query<{ id: string }>(
      `insert into public.dashboard_announcements(title,body,audience,active,starts_at,ends_at) values('Notice','Safe plain text',$1,$2,${start},${end}) returning id`,
      [audience, active],
    )
  )[0]!.id;
}
describe("Announcement audit and notification RLS", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
      grant usage on schema auth,storage to anon,authenticated,service_role;
      grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    for (const file of [
      "202609190001_auth_profiles.sql",
      "202609260002_learning.sql",
      "202609270001_learning_maintenance.sql",
      "202609270002_learning_upload_limit.sql",
      "202609290001_quiz.sql",
      "202609300001_dashboard.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    // Status is the prerequisite from administrator Users; pg_trgm is not emulated here.
    await db.exec("alter table public.profiles add column status text not null default 'active'");
    await db.exec(
      await readFile("supabase/migrations/202610040004_announcements_notifications.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202610040006_notification_visibility.sql", "utf8"),
    );
    await db.query(
      "insert into auth.users(id,email) values ($1,'admin@test.invalid'),($2,'alice@test.invalid'),($3,'bob@test.invalid')",
      [admin, alice, bob],
    );
    await db.query("update public.profiles set role='super_admin' where id=$1", [admin]);
    // Awareness source shape needed by translation FKs; full Awareness policies
    // are exercised by its existing integration suite and hosted tests.
    await db.exec(
      "create table public.awareness_resources(id uuid primary key,version integer not null default 1,language text not null default 'en',status text not null default 'Draft')",
    );
    await db.exec(
      await readFile("supabase/migrations/202610040005_content_translations.sql", "utf8"),
    );
    await db.exec(`insert into public.learning_topics(id,name,slug,status) values('t-translate','Safety','translation-safety','Active');
      insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status) values('m-translate','t-translate','English module','English summary','Beginner',10,1,'Published');
      insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status) values('l-translate','m-translate','t-translate','English lesson','English summary','Beginner',10,1,'Published');`);
  }, 60000);
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.exec("begin");
  });
  afterEach(async () => {
    await db.exec("reset role; rollback");
  });

  it("records create, edit, activate, deactivate and delete through existing admin RPCs", async () => {
    await as(admin);
    const payload = {
      title: "Notice",
      body: "Safe text",
      audience: "All Learners",
      active: false,
      startsAt: "2026-01-01",
      endsAt: "2027-01-01",
    };
    await query("select public.dashboard_save_announcement($1)", [payload]);
    const id = (await query<{ id: string }>("select id from public.dashboard_announcements"))[0]!
      .id;
    for (const change of [{ title: "Edited" }, { active: true }, { active: false }]) {
      Object.assign(payload, change);
      await query("select public.dashboard_save_announcement($1)", [{ ...payload, id }]);
    }
    await query("select public.dashboard_delete_announcement($1)", [id]);
    const audits = await query<{
      action: string;
      actor_uuid: string;
      before_state: unknown;
      after_state: unknown;
    }>("select * from public.announcement_audit order by created_at,id");
    expect(audits.map((x) => x.action).sort()).toEqual([
      "activate",
      "create",
      "deactivate",
      "delete",
      "edit",
    ]);
    expect(audits.every((x) => x.actor_uuid === admin)).toBe(true);
    expect(audits.find((x) => x.action === "delete")?.before_state).toBeTruthy();
    expect(audits.find((x) => x.action === "delete")?.after_state).toBeNull();
  });
  it("denies anonymous RPCs and learner audit writes or administrator mutations", async () => {
    await as(null);
    await expect(query("select public.notifications_sync()")).rejects.toMatchObject({
      code: "42501",
    });
    await as(alice);
    expect(await query("select * from public.announcement_audit")).toEqual([]);
    await expect(
      query(
        "insert into public.announcement_audit(announcement_id,action,after_state) values(gen_random_uuid(),'create','{}')",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(query("select public.dashboard_save_announcement('{}')")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(notice()).rejects.toMatchObject({ code: "42501" });
  });
  it("delivers scheduled audience-matched notices exactly once", async () => {
    await seedNotice();
    await seedNotice("New Learners");
    await seedNotice("Administrators");
    await seedNotice("All Learners", "current_date+1", "current_date+2");
    await seedNotice("All Learners", "current_date-2", "current_date-1");
    await seedNotice("All Learners", "current_date", "current_date", false);
    await as(alice);
    expect((await query<{ n: number }>("select public.notifications_sync() n"))[0]!.n).toBe(2);
    expect((await query<{ n: number }>("select public.notifications_sync() n"))[0]!.n).toBe(0);
    expect(await query("select * from public.dashboard_announcements")).toHaveLength(2);
    await as(admin);
    expect((await query<{ n: number }>("select public.notifications_sync() n"))[0]!.n).toBe(1);
    expect(await query("select * from public.notification_generation_audit")).toHaveLength(2);
  });
  it("excludes older learners and respects notification preferences", async () => {
    await seedNotice("New Learners");
    await seedNotice();
    await db.query("update public.profiles set created_at=now()-interval '31 days' where id=$1", [
      alice,
    ]);
    await db.query("update public.profiles set notifications=false where id=$1", [bob]);
    await as(alice);
    expect((await query<{ n: number }>("select public.notifications_sync() n"))[0]!.n).toBe(1);
    await as(bob);
    expect((await query<{ n: number }>("select public.notifications_sync() n"))[0]!.n).toBe(0);
  });
  it("isolates content and read state across users and disallows arbitrary creation", async () => {
    await seedNotice();
    await as(alice);
    await query("select public.notifications_sync()");
    const id = (await query<{ id: string }>("select id from public.in_app_notifications"))[0]!.id;
    await expect(
      query("update public.in_app_notifications set title='Injected'"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      query(
        "insert into public.in_app_notifications(user_id,event_key,category,title,body,href) values($1,'evil','announcement','Evil','Evil','/dashboard')",
        [alice],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await as(bob);
    expect(await query("select * from public.in_app_notifications")).toEqual([]);
    await expect(
      query("select public.notifications_set_read($1,true)", [id]),
    ).rejects.toMatchObject({ code: "P0002" });
    await as(alice);
    await query("select public.notifications_set_read($1,true)", [id]);
    expect(
      (await query<{ n: { unreadCount: number } }>("select public.notifications_list() n"))[0]!.n
        .unreadCount,
    ).toBe(0);
    await query("select public.notifications_set_read($1,false)", [id]);
    expect(
      (await query<{ n: { unreadCount: number } }>("select public.notifications_list() n"))[0]!.n
        .unreadCount,
    ).toBe(1);
    await query("select public.notifications_read_all()");
    expect(
      (await query<{ n: { unreadCount: number } }>("select public.notifications_list() n"))[0]!.n
        .unreadCount,
    ).toBe(0);
  });
  it("bounds pagination and preserves delivered history after announcement deletion", async () => {
    const id = await seedNotice();
    await as(alice);
    await query("select public.notifications_sync()");
    await expect(query("select public.notifications_list(null,null,51)")).rejects.toMatchObject({
      code: "22023",
    });
    await expect(query("select public.notifications_list(now(),null,20)")).rejects.toMatchObject({
      code: "22023",
    });
    const item = (
      await query<{ id: string; created_at: string }>("select * from public.in_app_notifications")
    )[0]!;
    expect(
      (
        await query<{ n: { items: unknown[] } }>("select public.notifications_list($1,$2,20) n", [
          item.created_at,
          item.id,
        ])
      )[0]!.n.items,
    ).toEqual([]);
    await as(admin);
    await query("select public.dashboard_delete_announcement($1)", [id]);
    await as(alice);
    expect(await query("select * from public.in_app_notifications")).toEqual([]);
    const history = (
      await query<{ n: { items: { available: boolean; body: string; href: string | null }[] } }>(
        "select public.notifications_list() n",
      )
    )[0]!.n.items;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ available: false, body: "", href: null });
  });
  it("denies suspended account notification reads and read state mutation", async () => {
    await seedNotice();
    await as(alice);
    await query("select public.notifications_sync()");
    await db.exec("reset role");
    await db.query("update public.profiles set status='suspended' where id=$1", [alice]);
    await as(alice);
    expect(await query("select * from public.in_app_notifications")).toEqual([]);
    for (const sql of [
      "select public.notifications_sync()",
      "select public.notifications_list()",
      "select public.notifications_read_all()",
    ])
      await expect(query(sql)).rejects.toMatchObject({ code: "42501" });
  });
  it.each(["deactivate", "retarget", "expire", "reschedule"] as const)(
    "redacts %s notices from history and denies direct snapshot reads",
    async (mode) => {
      const id = await seedNotice();
      await as(alice);
      await query("select public.notifications_sync()");
      const notification = (
        await query<{ id: string }>("select id from public.in_app_notifications")
      )[0]!.id;
      await db.exec("reset role");
      const changes = {
        deactivate: "active=false",
        retarget: "audience='Administrators'",
        expire: "starts_at=current_date-2,ends_at=current_date-1",
        reschedule: "starts_at=current_date+1,ends_at=current_date+2",
      };
      await query(`update public.dashboard_announcements set ${changes[mode]} where id=$1`, [id]);
      await as(alice);
      expect(await query("select * from public.in_app_notifications")).toEqual([]);
      const history = (
        await query<{ n: { items: unknown[] } }>("select public.notifications_list() n")
      )[0]!.n.items;
      expect(history).toEqual([
        expect.objectContaining({
          id: notification,
          available: false,
          title: "",
          body: "",
          href: null,
        }),
      ]);
      await query("select public.notifications_set_read($1,true)", [notification]);
      expect(
        (await query<{ n: { unreadCount: number } }>("select public.notifications_list() n"))[0]!.n
          .unreadCount,
      ).toBe(0);
    },
  );

  const translation = {
    kind: "lessons",
    sourceId: "l-translate",
    sourceVersion: 1,
    expectedVersion: 0,
    language: "si",
    status: "Draft",
    content: {
      title: "Reviewed Sinhala lesson",
      summary: "Translated summary",
      objectives: ["Translated objective"],
      blocks: [{ kind: "paragraph", text: "Reviewed translation fixture" }],
    },
  };
  async function saveTranslation(payload: unknown) {
    return query("select public.content_translation_save($1)", [payload]);
  }
  async function listTranslations(adminMode = false, language = "si") {
    return (
      await query<{ t: unknown[] }>(
        "select public.content_translation_list('lessons',array['l-translate'],$1,$2) t",
        [language, adminMode],
      )
    )[0]!.t;
  }
  it("keeps drafts private and falls back until explicitly published", async () => {
    await as(admin);
    await saveTranslation(translation);
    expect(await listTranslations(true)).toHaveLength(1);
    await as(null);
    expect(await listTranslations()).toEqual([]);
    await expect(listTranslations(true)).rejects.toMatchObject({ code: "42501" });
    await as(admin);
    await saveTranslation({ ...translation, expectedVersion: 1, status: "Published" });
    await as(alice);
    expect(await listTranslations()).toHaveLength(1);
    const publicRecord = (await listTranslations())[0] as Record<string, unknown>;
    expect(publicRecord).not.toHaveProperty("editor_uuid");
    expect(await listTranslations(false, "ta")).toEqual([]);
  });
  it("denies learner translation writes and direct table access", async () => {
    await as(alice);
    await expect(saveTranslation(translation)).rejects.toMatchObject({ code: "42501" });
    await expect(query("select * from public.content_translations")).rejects.toMatchObject({
      code: "42501",
    });
    expect(await query("select * from public.content_translation_audit")).toEqual([]);
  });
  it("rejects stale editors and prevents duplicate language variants", async () => {
    await as(admin);
    await saveTranslation(translation);
    await expect(saveTranslation(translation)).rejects.toMatchObject({ code: "40001" });
    await saveTranslation({ ...translation, expectedVersion: 1 });
    expect(await listTranslations(true)).toHaveLength(1);
    await expect(
      saveTranslation({ ...translation, sourceVersion: 2, expectedVersion: 2 }),
    ).rejects.toMatchObject({ code: "40001" });
  });
  it("invalidates translations on source revision and hides withdrawn sources", async () => {
    await as(admin);
    await saveTranslation({ ...translation, status: "Published" });
    await db.exec(
      "reset role; update public.learning_lessons set version=version+1 where id='l-translate'",
    );
    await as(alice);
    expect(await listTranslations()).toEqual([]);
    await as(admin);
    expect((await listTranslations(true))[0]).toHaveProperty("stale", true);
    await saveTranslation({
      ...translation,
      sourceVersion: 2,
      expectedVersion: 1,
      status: "Published",
    });
    await db.exec(
      "reset role; update public.learning_modules set status='Draft' where id='m-translate'",
    );
    await as(null);
    expect(await listTranslations()).toEqual([]);
  });
  it("rejects ownership/media injection, incomplete content and invalid blocks", async () => {
    await as(admin);
    for (const content of [
      { ...translation.content, href: "javascript:alert(1)" },
      { title: "Partial" },
      { ...translation.content, blocks: [{ kind: "html", text: "<script>" }] },
    ])
      await expect(saveTranslation({ ...translation, content })).rejects.toBeTruthy();
    await expect(
      query(
        "select public.content_translation_list('lessons',array_fill('l-translate'::text,array[101]),'si',false)",
      ),
    ).rejects.toMatchObject({ code: "22023" });
  });
  it("records administrative translation snapshots and preserves original language", async () => {
    await as(admin);
    await saveTranslation(translation);
    await saveTranslation({ ...translation, expectedVersion: 1, status: "Published" });
    const audit = await query<{ actor_uuid: string }>(
      "select * from public.content_translation_audit",
    );
    expect(audit).toHaveLength(2);
    expect(audit.every((x) => x.actor_uuid === admin)).toBe(true);
    await db.exec("reset role");
    const source = crypto.randomUUID();
    await query(
      "insert into public.awareness_resources(id,language,status) values($1,'si','Published')",
      [source],
    );
    await as(admin);
    await saveTranslation({
      ...translation,
      kind: "awareness",
      sourceId: source,
      language: "en",
      content: { title: "Reviewed English variant" },
      status: "Published",
    });
    expect(
      (
        await query<{ t: Record<string, unknown>[] }>(
          "select public.content_translation_list('awareness',array[$1],'en',true) t",
          [source],
        )
      )[0]!.t[0],
    ).toHaveProperty("source_language", "si");
  });
});
