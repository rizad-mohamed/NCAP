// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, beforeEach, afterEach, afterAll, describe, it, expect } from "vitest";
import type { LearningModule, Lesson } from "@/data/types";

const admin = "00000000-0000-4000-8000-000000000001";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
const topic = { id: "topic-test", name: "Safety", slug: "safety", status: "Active" };
const module = {
  id: "m-test",
  topicId: topic.id,
  topic: topic.name,
  title: "Safe accounts",
  description: "Practical guidance",
  difficulty: "Beginner",
  minutes: 10,
  order: 1,
  status: "Draft",
  objectives: ["Protect an account"],
  quizId: "",
};
const lesson = {
  ...module,
  id: "l-test",
  moduleId: module.id,
  summary: "Build a passphrase",
  blocks: [{ kind: "paragraph", text: "Use a unique passphrase." }],
};
let db: PGlite;
async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await db.exec("savepoint test_statement");
  try {
    const result = await db.query<T>(sql, params);
    await db.exec("release savepoint test_statement");
    return result.rows;
  } catch (error) {
    await db.exec("rollback to savepoint test_statement; release savepoint test_statement");
    throw error;
  }
}
async function as(user: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.exec(user ? "set role authenticated" : "set role anon");
}
async function save<T = LearningModule>(kind: string, payload: unknown): Promise<T> {
  return (
    await query<{ record: T }>("select public.save_learning_record($1,$2::jsonb) record", [
      kind,
      JSON.stringify(payload),
    ])
  )[0]!.record;
}
async function list(kind: string, filters = {}) {
  return (
    await query<{ result: { items: (LearningModule & Lesson)[]; total: number } }>(
      "select public.learning_list($1::jsonb) result",
      [JSON.stringify({ kind, ...filters })],
    )
  )[0]!.result;
}
async function mutate(payload: unknown) {
  return (
    await query<{
      state: {
        completedLessons: string[];
        bookmarks: string[];
        activities: unknown[];
        resume: Record<string, { seconds: number }>;
      };
    }>("select public.mutate_learning_state($1::jsonb) state", [JSON.stringify(payload)])
  )[0]!.state;
}
async function publish() {
  await save("modules", { ...module, version: 1, status: "Published" });
  await save("lessons", { ...lesson, version: 1, status: "Published" });
}

describe("Learning PostgreSQL migrations, RPC transactions and actual RLS", () => {
  beforeAll(async () => {
    db = new PGlite();
    // Supabase-owned auth/storage objects are represented locally; production migrations run unmodified.
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
      grant select,insert,update,delete on storage.objects to anon,authenticated;
    `);
    await db.exec(await readFile("supabase/migrations/202609190001_auth_profiles.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/202609260002_learning.sql", "utf8"));
    await db.exec(
      await readFile("supabase/migrations/202609270001_learning_maintenance.sql", "utf8"),
    );
    await db.query(
      "insert into auth.users(id,email) values ($1,'admin@test.invalid'),($2,'alice@test.invalid'),($3,'bob@test.invalid')",
      [admin, alice, bob],
    );
    await db.query("update public.profiles set role='super_admin' where id=$1", [admin]);
  }, 30000);
  beforeEach(async () => {
    await db.exec("begin");
    await as(admin);
    await save("topics", topic);
    await save("modules", module);
    await save("lessons", lesson);
  });
  afterEach(async () => {
    await db.exec("reset role; rollback");
  });
  afterAll(async () => {
    await db.close();
  });

  it("migrates normalized tables, constraints, private bucket and RLS", async () => {
    await db.exec("reset role");
    const tables = await query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname like 'learning_%' and relkind='r'",
    );
    expect(tables).toHaveLength(12);
    expect(tables.every((t) => t.relrowsecurity)).toBe(true);
    expect(
      (await query("select public from storage.buckets where id='learning-media'"))[0]?.["public"],
    ).toBe(false);
  });
  it("hides drafts and their objectives/blocks from guests and learners", async () => {
    for (const user of [null, alice, bob]) {
      await as(user);
      expect((await list("modules")).items).toEqual([]);
      expect(await query("select * from public.learning_lesson_blocks")).toEqual([]);
      await expect(list("lessons", { admin: true })).rejects.toMatchObject({ code: "42501" });
    }
  });
  it("rejects content writes through both RPC and direct tables for learners", async () => {
    await as(alice);
    await expect(save("modules", { ...module, version: 1 })).rejects.toMatchObject({
      code: "42501",
    });
    await expect(query("update public.learning_modules set title='Hacked'")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      query("select public.delete_learning_record('lessons','l-test',1)"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      query("select public.reorder_learning_records('modules','[]')"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      query("update public.profiles set role='super_admin' where id=$1", [alice]),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("publishes hierarchy, supports filters/search/paging and hides unpublished ancestors", async () => {
    await publish();
    await as(null);
    expect(
      (await list("modules", { search: "safe", difficulty: "Beginner", topicId: topic.id })).total,
    ).toBe(1);
    expect(
      (await list("lessons", { search: "unique passphrase", moduleId: module.id })).items[0]?.id,
    ).toBe(lesson.id);
    expect((await list("lessons", { offset: 1 })).items).toEqual([]);
    await as(admin);
    await save("modules", { ...module, version: 2, status: "Draft" });
    await as(alice);
    expect((await list("lessons")).total).toBe(0);
    await expect(mutate({ action: "complete", lessonId: lesson.id })).rejects.toMatchObject({
      code: "P0002",
    });
  });
  it("deactivating a topic hides all descendant content", async () => {
    await publish();
    await save("topics", { ...topic, version: 1, status: "Inactive" });
    await as(null);
    expect((await list("modules")).total).toBe(0);
    expect((await list("lessons")).total).toBe(0);
  });
  it("renames topics by ID without rewriting content or breaking relationships", async () => {
    await save("topics", { ...topic, version: 1, name: "Account safety" });
    const item = (await list("lessons", { admin: true })).items[0]!;
    expect(item.topicId).toBe(topic.id);
    expect(item.topic).toBe("Account safety");
    expect(item.version).toBe(1);
  });
  it("rejects stale saves/deletes and records the authenticated audit actor", async () => {
    const saved = await save("modules", { ...module, version: 1, title: "Updated" });
    expect(saved.version).toBe(2);
    await expect(save("modules", { ...module, version: 1 })).rejects.toMatchObject({
      code: "PT409",
    });
    await expect(
      query("select public.delete_learning_record('modules','m-test',1)"),
    ).rejects.toMatchObject({ code: "PT409" });
    const audit = await query(
      "select actor_id,action from public.learning_audit where kind='modules' order by id",
    );
    expect(audit).toEqual([
      { actor_id: admin, action: "create" },
      { actor_id: admin, action: "update" },
    ]);
  });
  it("rejects orphan relationships, referenced parent deletion and invalid blocks", async () => {
    await expect(
      save("lessons", { ...lesson, id: "orphan", moduleId: "missing" }),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      query("select public.delete_learning_record('topics','topic-test',1)"),
    ).rejects.toMatchObject({ code: "23001" });
    await expect(
      query("select public.delete_learning_record('modules','m-test',1)"),
    ).rejects.toMatchObject({ code: "23001" });
    await expect(
      save("lessons", {
        ...lesson,
        version: 1,
        blocks: [
          {
            kind: "check",
            question: "Test?",
            options: ["a", "b"],
            correctIndex: 9,
            explanation: "why",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "23514" });
    expect((await list("lessons", { admin: true })).items[0]?.blocks).toEqual(lesson.blocks);
  });
  it("requires transcripts for published videos", async () => {
    await expect(
      save("lessons", {
        ...lesson,
        version: 1,
        status: "Published",
        video: { kind: "external", url: "https://example.com/test.mp4", transcript: "" },
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("reorders lessons atomically and rolls the entire operation back on conflicts", async () => {
    await save("lessons", { ...lesson, id: "l-second", order: 2 });
    await query("select public.reorder_learning_records('lessons',$1::jsonb)", [
      JSON.stringify([
        { id: lesson.id, version: 1, order: 2 },
        { id: "l-second", version: 1, order: 1 },
      ]),
    ]);
    expect((await list("lessons", { admin: true })).items.map((r) => r.id)).toEqual([
      "l-second",
      lesson.id,
    ]);
    await expect(
      query("select public.reorder_learning_records('lessons',$1::jsonb)", [
        JSON.stringify([
          { id: lesson.id, version: 2, order: 1 },
          { id: "l-second", version: 1, order: 2 },
        ]),
      ]),
    ).rejects.toMatchObject({ code: "PT409" });
    expect((await list("lessons", { admin: true })).items[0]?.id).toBe("l-second");
  });
  it("persists completion, bookmark, resume and activity only for the signed-in learner", async () => {
    await publish();
    await as(alice);
    await mutate({ action: "complete", lessonId: lesson.id, user_id: bob });
    await mutate({ action: "complete", lessonId: lesson.id });
    await mutate({ action: "bookmark", lessonId: lesson.id, saved: true });
    const state = await mutate({
      action: "resume",
      lessonId: lesson.id,
      source: "video-v1",
      seconds: 25,
    });
    expect(state.completedLessons).toEqual([lesson.id]);
    expect(state.bookmarks).toEqual([lesson.id]);
    expect(state.activities).toHaveLength(2);
    expect(state.resume[lesson.id]?.seconds).toBe(25);
    await as(bob);
    expect(await query("select * from public.learning_completions")).toEqual([]);
    expect(await query("select * from public.learning_bookmarks")).toEqual([]);
    expect(await query("select * from public.learning_video_resume")).toEqual([]);
    expect(await query("select * from public.learning_activity")).toEqual([]);
    await expect(
      query("insert into public.learning_completions(user_id,lesson_id) values($1,$2)", [
        alice,
        lesson.id,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await as(alice);
    expect(
      (await mutate({ action: "bookmark", lessonId: lesson.id, saved: false })).bookmarks,
    ).toEqual([]);
  });
  it("does not allow anonymous state mutations", async () => {
    await publish();
    await as(null);
    await expect(mutate({ action: "complete", lessonId: lesson.id })).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("deleting a lesson removes dependent progress and blocks while retaining activity history", async () => {
    await publish();
    await as(alice);
    await mutate({ action: "complete", lessonId: lesson.id });
    await as(admin);
    await query("select public.delete_learning_record('lessons','l-test',2)");
    await as(alice);
    expect(await query("select * from public.learning_completions")).toEqual([]);
    expect(
      (await query("select lesson_id from public.learning_activity"))[0]?.["lesson_id"],
    ).toBeNull();
    await as(admin);
    expect(await query("select * from public.learning_lesson_blocks")).toEqual([]);
    await query("select public.delete_learning_record('modules','m-test',2)");
    await query("select public.delete_learning_record('topics','topic-test',1)");
  });
  it("enforces private media access, immutable uploads, attachment and retirement", async () => {
    const id = "10000000-0000-4000-8000-000000000001",
      path = admin + "/image.png";
    await query(
      "insert into public.learning_media_assets(id,path,file_name,role,mime_type,size_bytes,width,height,alt_text,uploaded_by) values($1,$2,'image.png','image','image/png',100,10,10,'Example',$3)",
      [id, path, admin],
    );
    await query("insert into storage.objects(bucket_id,name) values('learning-media',$1)", [path]);
    await as(alice);
    expect(await query("select * from storage.objects")).toEqual([]);
    await expect(
      query("insert into storage.objects(bucket_id,name) values('learning-media','rogue.png')"),
    ).rejects.toMatchObject({ code: "42501" });
    await as(admin);
    await query("update public.learning_media_assets set state='ready' where id=$1", [id]);
    await save("modules", { ...module, version: 1, status: "Published", image: { id } });
    await as(null);
    expect(await query("select * from storage.objects")).toHaveLength(1);
    await as(admin);
    await query("select public.retire_learning_media($1)", [id]);
    expect(
      (await query("select state from public.learning_media_assets where id=$1", [id]))[0]?.[
        "state"
      ],
    ).toBe("active");
    expect(await query("update storage.objects set name='overwritten.png' returning *")).toEqual(
      [],
    );
    await save("modules", { ...module, version: 2 });
    expect(
      (await query("select state from public.learning_media_assets where id=$1", [id]))[0]?.[
        "state"
      ],
    ).toBe("retired");
    await as(null);
    expect(await query("select * from storage.objects")).toEqual([]);
  });
  it("imports the bundled catalogue idempotently with stable routes", async () => {
    const seed = (await readFile("supabase/learning-seed.sql", "utf8")).replace(
      /^begin;|^commit;/gm,
      "",
    );
    await db.exec(seed);
    await db.exec(seed);
    const modules = await list("modules", { admin: true });
    expect(modules.items.some((m) => m.id === "m-fundamentals")).toBe(true);
    expect(modules.total).toBe(6);
    expect((await list("lessons", { admin: true })).total).toBe(19);
  });
  it("lets the maintenance role retire and delete only unreferenced expired uploads", async () => {
    const id = "20000000-0000-4000-8000-000000000001";
    await query(
      "insert into public.learning_media_assets(id,path,file_name,role,mime_type,size_bytes,width,height,alt_text,created_at) values($1,'expired/image.png','image.png','image','image/png',100,10,10,'Example',now()-interval '25 hours')",
      [id],
    );
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','service_role',false)",
    );
    await db.exec("set role service_role");
    await query("select public.retire_learning_media()");
    expect(
      (
        await query<{ state: string }>(
          "select state from public.learning_media_assets where id=$1",
          [id],
        )
      )[0]?.state,
    ).toBe("retired");
    await query("delete from public.learning_media_assets where id=$1", [id]);
    expect(await query("select id from public.learning_media_assets where id=$1", [id])).toEqual(
      [],
    );
  });
});
