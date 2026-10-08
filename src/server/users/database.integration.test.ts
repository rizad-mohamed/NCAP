// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const admin = "00000000-0000-4000-8000-000000000001";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
let db: PGlite;
async function as(user: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [
    user ? "authenticated" : "anon",
  ]);
  await db.exec(user ? "set role authenticated" : "set role anon");
}
async function query<T>(sql: string, params: unknown[] = []) {
  await db.exec("savepoint users_statement");
  try {
    const rows = (await db.query<T>(sql, params)).rows;
    await db.exec("release savepoint users_statement");
    return rows;
  } catch (error) {
    await db.exec("rollback to savepoint users_statement; release savepoint users_statement");
    throw error;
  }
}
describe("administrator users database contracts", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',banned_until timestamptz);
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
      "202609300002_dashboard_session_limit.sql",
    ]) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      "insert into auth.users(id,email) values ($1,'admin@test.invalid'),($2,'alice@test.invalid'),($3,'bob@test.invalid')",
      [admin, alice, bob],
    );
    await db.query("update public.profiles set role='super_admin' where id=$1", [admin]);
    const migration = await readFile("supabase/migrations/202609300003_admin_users.sql", "utf8");
    // PGlite omits pg_trgm; production applies these two indexes unchanged.
    await db.exec(
      migration
        .replace(/create extension if not exists pg_trgm with schema extensions;\s*/i, "")
        .replace(/create index if not exists profiles_email_search[^;]+;\s*/i, "")
        .replace(/create index if not exists profiles_name_search[^;]+;\s*/i, ""),
    );
    const guard = await readFile(
      "supabase/migrations/202609300004_admin_users_request_guard.sql",
      "utf8",
    );
    await db.exec(
      guard.replace(/alter role authenticator set pgrst\.db_pre_request[^;]+;\s*/i, ""),
    );
    await db.exec(await readFile("supabase/migrations/202610040001_auth_finalization.sql", "utf8"));
    await db.exec(
      await readFile("supabase/migrations/202610040002_auth_constraint_permissions.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202610040003_profile_avatar_constraints.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202610080001_admin_user_detail_summary.sql", "utf8"),
    );
  }, 60000);
  it("detail summary excludes draft lessons and handles an empty published catalogue", async () => {
    await db.exec("begin");
    try {
      await query(
        "insert into public.learning_topics(id,name,slug,status) values('t-detail','Safety','detail-safety','Active')",
      );
      await query(
        "insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status) values('m-detail','t-detail','Safe accounts','Accounts','Beginner',10,1,'Published')",
      );
      await query(
        "insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status) values('l-detail','m-detail','t-detail','Published','Published','Beginner',10,1,'Published'),('l-detail-draft','m-detail','t-detail','Draft','Draft','Beginner',10,2,'Draft')",
      );
      await query(
        "insert into public.learning_completions(user_id,lesson_id) values($1,'l-detail'),($1,'l-detail-draft')",
        [alice],
      );
      await as(admin);
      const detail = async () =>
        (
          await query<{
            result: { completedLessons: number; completedModules: number; progressPercent: number };
          }>("select public.admin_user_details($1) result", [alice])
        )[0]!.result;
      expect(await detail()).toMatchObject({
        completedLessons: 2,
        completedModules: 1,
        progressPercent: 100,
      });
      await db.exec("reset role");
      await query("delete from public.learning_lessons where id='l-detail'");
      await as(admin);
      expect(await detail()).toMatchObject({
        completedLessons: 1,
        completedModules: 0,
        progressPercent: 0,
      });
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  afterAll(async () => {
    await db.close();
  });
  it("paginates, searches, filters, sorts and returns private progress only to admins", async () => {
    await db.exec("begin");
    try {
      await query(
        "insert into public.learning_topics(id,name,slug,status) values('t-users','Safety','safety','Active')",
      );
      await query(
        "insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status) values('m-users','t-users','Safe accounts','Accounts','Beginner',10,1,'Published')",
      );
      await query(
        "insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status) values('l-users','m-users','t-users','Passwords','Passwords','Beginner',10,1,'Published')",
      );
      await query(
        "insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,question_count,status) values('q-users','m-users','Safety quiz','safety-quiz','Safety','Safety','Beginner',1,'Published')",
      );
      await query(
        "insert into public.learning_completions(user_id,lesson_id) values($1,'l-users')",
        [alice],
      );
      await query(
        "insert into public.quiz_attempts(user_id,quiz_id,attempt_number,deadline_at,completed_at,status,score_percent) values($1,'q-users',1,now(),now(),'submitted',80)",
        [alice],
      );
      await as(admin);
      const result = (
        await query<{
          result: {
            total: number;
            items: {
              email: string;
              completedLessons: number;
              completedModules: number;
              progressPercent: number;
              quizAverage: number;
              attempts: number;
            }[];
          };
        }>("select public.admin_users_list(0,1,'alice','learner','active','email','asc') result")
      )[0]!.result;
      expect(result.total).toBe(1);
      expect(result.items[0]?.email).toBe("alice@test.invalid");
      expect(result.items[0]).toMatchObject({
        completedLessons: 1,
        completedModules: 1,
        progressPercent: 100,
        quizAverage: 80,
        attempts: 1,
      });
      const detail = (
        await query<{
          result: {
            email: string;
            completedModules: number;
            progressPercent: number;
            modules: { completed: number; total: number }[];
          };
        }>("select public.admin_user_details($1) result", [alice])
      )[0]!.result;
      expect(detail.email).toBe("alice@test.invalid");
      expect(detail).toMatchObject({ completedModules: 1, progressPercent: 100 });
      expect(detail.modules[0]).toMatchObject({ completed: 1, total: 1 });
      const emptyDetail = (
        await query<{ result: { completedModules: number; progressPercent: number } }>(
          "select public.admin_user_details($1) result",
          [bob],
        )
      )[0]!.result;
      expect(emptyDetail).toMatchObject({ completedModules: 0, progressPercent: 0 });
      await as(alice);
      await expect(query("select public.admin_users_list() result")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(
        query("select public.admin_user_details($1) result", [bob]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        query("select public.admin_user_change($1,'super_admin',null,'')", [alice]),
      ).rejects.toMatchObject({ code: "42501" });
      expect(await query("select * from public.admin_user_audit")).toEqual([]);
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("audits role and status, bans restricted accounts, and protects the final admin", async () => {
    await db.exec("begin");
    try {
      await as(admin);
      await query("select public.admin_user_change($1,'super_admin',null,'promotion')", [alice]);
      await query("select public.admin_user_change($1,null,'suspended','security review')", [
        alice,
      ]);
      const audit = await query<{ action: string }>(
        "select action from public.admin_user_audit order by id",
      );
      expect(audit.map((row) => row.action)).toEqual(["role_changed", "suspended"]);
      await db.exec("reset role");
      const ban = await query<{ banned: boolean }>(
        "select banned_until>now() banned from auth.users where id=$1",
        [alice],
      );
      expect(ban[0]?.banned).toBe(true);
      await as(admin);
      await query("select private.check_active_account_request()");
      await as(alice);
      await expect(query("select private.check_active_account_request()")).rejects.toMatchObject({
        code: "42501",
      });
      await as(admin);
      await expect(
        query("select public.admin_user_change($1,null,'suspended','security review')", [admin]),
      ).rejects.toMatchObject({ code: "22023" });
      await db.exec("reset role");
      await expect(
        query("update public.profiles set status='disabled' where id=$1", [admin]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        query("update public.profiles set role='learner' where id=$1", [admin]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(query("delete from auth.users where id=$1", [admin])).rejects.toMatchObject({
        code: "23514",
      });
      await as(admin);
      await query("select public.admin_user_change($1,null,'active','restored')", [alice]);
      await query("select public.admin_user_change($1,'learner',null,'downgrade')", [alice]);
      expect(
        (
          await query<{ action: string }>("select action from public.admin_user_audit order by id")
        ).map((row) => row.action),
      ).toEqual(["role_changed", "suspended", "restored", "role_changed"]);
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("persists safe profile fields and denies cross-user, privileged and inactive updates", async () => {
    await db.exec("begin");
    try {
      await as(alice);
      await query(
        "update public.profiles set interests=ARRAY['Passwords'],phone='+94123456789' where id=$1",
        [alice],
      );
      expect(
        (
          await query<{ interests: string[] }>(
            "select interests from public.profiles where id=$1",
            [alice],
          )
        )[0]?.interests,
      ).toEqual(["Passwords"]);
      expect(await query("select id from public.profiles where id=$1", [bob])).toEqual([]);
      expect(
        await query("update public.profiles set display_name='Intruder' where id=$1 returning id", [
          bob,
        ]),
      ).toEqual([]);
      await expect(
        query("update public.profiles set role='super_admin' where id=$1", [alice]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        query("update public.profiles set status='active' where id=$1", [alice]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        query("update public.profiles set interests=ARRAY['x','x'] where id=$1", [alice]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        query("update public.profiles set avatar=$2 where id=$1", [
          alice,
          JSON.stringify({ storageKey: "data:image/svg+xml;base64,PHN2Zz4=", status: "ready" }),
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        query("update public.profiles set avatar=$2 where id=$1", [
          alice,
          JSON.stringify({ storageKey: "data:image/png;base64,PHN2Zz4=", status: "ready" }),
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      );
      const avatar = {
        id: alice,
        fileName: "avatar.png",
        mimeType: "image/png",
        sizeBytes: png.length,
        width: 1,
        height: 1,
        altText: "Profile",
        storageKey: `data:image/png;base64,${png.toString("base64")}`,
        status: "ready",
      };
      await query("update public.profiles set avatar=$2 where id=$1", [
        alice,
        JSON.stringify(avatar),
      ]);
      await expect(
        query("update public.profiles set avatar=$2 where id=$1", [
          alice,
          JSON.stringify({ ...avatar, status: null }),
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await db.exec("reset role");
      await query("update public.profiles set status='suspended' where id=$1", [alice]);
      await as(alice);
      expect(
        await query(
          "update public.profiles set interests=ARRAY['blocked'] where id=$1 returning id",
          [alice],
        ),
      ).toEqual([]);
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("keeps durable audit identity when an Auth user is deleted", async () => {
    await db.exec("begin");
    try {
      await as(admin);
      await query("select public.admin_user_change($1,null,'suspended','security reason')", [
        alice,
      ]);
      await db.exec("reset role");
      await query("delete from auth.users where id=$1", [alice]);
      const row = (
        await query<{ target_id: string | null; target_identity: string; actor_identity: string }>(
          "select target_id,target_identity,actor_identity from public.admin_user_audit",
        )
      )[0];
      expect(row).toMatchObject({ target_id: null, target_identity: alice, actor_identity: admin });
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("restricts shared throttle execution and atomically bounds requests", async () => {
    await db.exec("begin");
    try {
      await as(null);
      await expect(query("select * from private.auth_attempt_limits")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(
        query("select public.auth_consume_attempt($1,2,60)", ["a".repeat(64)]),
      ).rejects.toMatchObject({ code: "42501" });
      await as(alice);
      await expect(query("delete from private.auth_attempt_limits")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(
        query("select public.auth_consume_attempt($1,2,60)", ["a".repeat(64)]),
      ).rejects.toMatchObject({ code: "42501" });
      await db.exec("reset role");
      expect(
        (
          await query<{ allowed: boolean }>(
            "select has_function_privilege('service_role','private.valid_profile_interests(text[])','execute') allowed",
          )
        )[0]?.allowed,
      ).toBe(true);
      await db.exec("reset role; set role service_role");
      for (const allowed of [true, true, false]) {
        expect(
          (
            await query<{ allowed: boolean }>(
              "select public.auth_consume_attempt($1,2,60) allowed",
              ["a".repeat(64)],
            )
          )[0]?.allowed,
        ).toBe(allowed);
      }
      await db.exec("reset role");
      await query("update private.auth_attempt_limits set started_at=now()-interval '2 minutes'");
      await db.exec("set role service_role");
      expect(
        (
          await query<{ allowed: boolean }>("select public.auth_consume_attempt($1,2,60) allowed", [
            "a".repeat(64),
          ])
        )[0]?.allowed,
      ).toBe(true);
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("allows exactly five registration increments, expires, and atomically bounds concurrent calls", async () => {
    await db.exec("begin; set role service_role");
    const bucket = "f".repeat(64);
    try {
      for (const allowed of [true, true, true, true, true, false]) {
        expect(
          (
            await query<{ allowed: boolean }>(
              "select public.auth_consume_attempt($1,5,300) allowed",
              [bucket],
            )
          )[0]?.allowed,
        ).toBe(allowed);
      }
      await db.exec("reset role");
      expect(
        (
          await query<{ attempts: number }>(
            "select attempts from private.auth_attempt_limits where bucket=$1",
            [bucket],
          )
        )[0]?.attempts,
      ).toBe(6);
      await query(
        "update private.auth_attempt_limits set started_at=clock_timestamp()-interval '301 seconds' where bucket=$1",
        [bucket],
      );
      await db.exec("set role service_role");
      // Queue directly on the database connection; savepoints in query() are for sequential statements.
      const results = await Promise.all(
        Array.from({ length: 12 }, () =>
          db.query<{ allowed: boolean }>("select public.auth_consume_attempt($1,5,300) allowed", [
            bucket,
          ]),
        ),
      );
      expect(results.filter((r) => r.rows[0]?.allowed)).toHaveLength(5);
      await db.exec("reset role");
      expect(
        (
          await query<{ attempts: number }>(
            "select attempts from private.auth_attempt_limits where bucket=$1",
            [bucket],
          )
        )[0]?.attempts,
      ).toBe(12);
    } finally {
      await db.exec("rollback; reset role");
    }
  });
});
