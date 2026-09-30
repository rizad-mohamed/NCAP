// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

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
  await db.exec("savepoint dashboard_statement");
  try {
    const rows = (await db.query<T>(sql, params)).rows;
    await db.exec("release savepoint dashboard_statement");
    return rows;
  } catch (error) {
    await db.exec(
      "rollback to savepoint dashboard_statement; release savepoint dashboard_statement",
    );
    throw error;
  }
}
describe("Dashboard database contracts", () => {
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
    await db.query(
      "insert into auth.users(id,email) values ($1,'admin@test.invalid'),($2,'alice@test.invalid'),($3,'bob@test.invalid')",
      [admin, alice, bob],
    );
    await db.query("update public.profiles set role='super_admin' where id=$1", [admin]);
    await db.exec(`insert into public.learning_topics(id,name,slug,status) values('t-test','Safety','safety','Active');
      insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status)
        values('m-test','t-test','Safe accounts','Accounts','Beginner',10,1,'Published');
      insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status)
        values('l-test','m-test','t-test','Safe passwords','Passwords','Beginner',10,1,'Published');
      insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,question_count,status)
        values('q-test','m-test','Safety quiz','phishing-safety','Safety check','Safety','Beginner',1,'Published');`);
  }, 60000);
  afterAll(async () => {
    await db.close();
  });
  it("keeps private progress, sessions and badges under RLS", async () => {
    await db.exec("begin");
    try {
      await as(alice);
      const session = (
        await query<{ id: string }>("select public.dashboard_begin_lesson('l-test') id")
      )[0]!.id;
      expect(session).toBeTruthy();
      await query("select public.mutate_learning_state($1::jsonb)", [
        JSON.stringify({ action: "complete", lessonId: "l-test" }),
      ]);
      const summary = (
        await query<{
          result: {
            statistics: { completedCount: number };
            badges: { id: string; earned: boolean }[];
            activities: { kind: string }[];
          };
        }>("select public.dashboard_learner(0) result")
      )[0]!.result;
      expect(summary.statistics.completedCount).toBe(1);
      expect(summary.badges.find((item) => item.id === "b-first-lesson")?.earned).toBe(true);
      expect(summary.activities.some((item) => item.kind === "opened")).toBe(true);
      await expect(
        query("insert into public.dashboard_user_badges(user_id,badge_id) values($1,'b-streak')", [
          alice,
        ]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        query("update public.learning_completions set lesson_id='l-test' where user_id=$1", [
          alice,
        ]),
      ).rejects.toMatchObject({ code: "42501" });
      await as(bob);
      expect(
        (
          await query<{
            result: { statistics: { completedCount: number }; activities: unknown[] };
          }>("select public.dashboard_learner(0) result")
        )[0]!.result.statistics.completedCount,
      ).toBe(0);
      expect(await query("select * from public.dashboard_learning_sessions")).toEqual([]);
      await expect(query("select public.dashboard_heartbeat($1)", [session])).rejects.toMatchObject(
        { code: "P0002" },
      );
    } finally {
      await db.exec("reset role; rollback");
    }
  });
  it("restricts aggregate reports and announcement changes to admins", async () => {
    await db.exec("begin");
    try {
      await as(alice);
      await expect(query("select public.dashboard_admin()")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(query("select public.dashboard_report()")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(
        query("select public.dashboard_save_announcement($1::jsonb)", [
          JSON.stringify({
            title: "False",
            body: "False",
            audience: "All Learners",
            active: true,
            startsAt: "2026-01-01",
            endsAt: "2026-12-31",
          }),
        ]),
      ).rejects.toMatchObject({ code: "42501" });
      await as(admin);
      await query("select public.dashboard_save_announcement($1::jsonb)", [
        JSON.stringify({
          title: "Welcome",
          body: "Start learning",
          audience: "All Learners",
          active: true,
          startsAt: "2020-01-01",
          endsAt: "2099-12-31",
        }),
      ]);
      expect(
        (await query<{ result: { users: number } }>("select public.dashboard_admin() result"))[0]!
          .result.users,
      ).toBe(2);
      await as(alice);
      expect(
        (
          await query<{ result: { announcements: { title: string }[] } }>(
            "select public.dashboard_learner(0) result",
          )
        )[0]!.result.announcements[0]?.title,
      ).toBe("Welcome");
    } finally {
      await db.exec("reset role; rollback");
    }
  });
  it("records bounded lesson time and awards quiz badges from trusted attempts", async () => {
    await db.exec("begin");
    try {
      await as(alice);
      const session = (
        await query<{ id: string }>("select public.dashboard_begin_lesson('l-test') id")
      )[0]!.id;
      await db.exec("reset role");
      await query(
        "update public.dashboard_learning_sessions set last_heartbeat_at=now()-interval '30 seconds' where id=$1",
        [session],
      );
      await as(alice);
      const seconds = (
        await query<{ seconds: number }>("select public.dashboard_heartbeat($1) seconds", [session])
      )[0]!.seconds;
      expect(seconds).toBeGreaterThanOrEqual(29);
      expect(seconds).toBeLessThanOrEqual(32);
      await db.exec("reset role");
      const attempt = (
        await query<{ id: string }>(
          "insert into public.quiz_attempts(user_id,quiz_id,attempt_number,deadline_at) values($1,'q-test',1,now()+interval '10 minutes') returning id",
          [alice],
        )
      )[0]!.id;
      await query(
        "update public.quiz_attempts set status='submitted',completed_at=now(),score_percent=90,correct_count=9,total_count=10,passed=true where id=$1",
        [attempt],
      );
      await as(alice);
      const summary = (
        await query<{
          result: { badges: { id: string; earned: boolean }[]; activities: { kind: string }[] };
        }>("select public.dashboard_learner(0) result")
      )[0]!.result;
      expect(summary.badges.find((item) => item.id === "b-phishing")?.earned).toBe(true);
      expect(summary.activities.some((item) => item.kind === "quiz")).toBe(true);
      await as(admin);
      const report = (
        await query<{ result: { attempts: { scorePercent: number }[]; learningSeconds: number } }>(
          "select public.dashboard_report(183,null,null) result",
        )
      )[0]!.result;
      expect(report.attempts[0]?.scorePercent).toBe(90);
      expect(report.learningSeconds).toBeGreaterThanOrEqual(29);
    } finally {
      await db.exec("reset role; rollback");
    }
  });
});
