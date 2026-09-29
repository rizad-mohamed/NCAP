// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from "vitest";

const admin = "00000000-0000-4000-8000-000000000001";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
let db: PGlite;
async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await db.exec("savepoint quiz_statement");
  try {
    const rows = (await db.query<T>(sql, params)).rows;
    await db.exec("release savepoint quiz_statement");
    return rows;
  } catch (error) {
    await db.exec("rollback to savepoint quiz_statement; release savepoint quiz_statement");
    throw error;
  }
}
async function as(user: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.exec(user ? "set role authenticated" : "set role anon");
}
async function rpc<T>(name: string, args: unknown[], signature: string) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
  return (
    await query<{ result: T }>(`select public.${name}(${placeholders}${signature}) result`, args)
  )[0]!.result;
}
const quiz = {
  id: "q-test",
  moduleId: "m-test",
  title: "Safety check",
  slug: "safety-check",
  description: "Check safe decisions",
  instructions: "",
  topic: "Safety",
  difficulty: "Beginner",
  durationSeconds: 600,
  passingPercent: 70,
  eligibilityPercent: 80,
  maxAttempts: 2,
  cooldownSeconds: 0,
  questionCount: 2,
  status: "Published",
};
const question = (id: string, order: number) => ({
  id,
  quizId: quiz.id,
  prompt: `Choose the safe action ${order}`,
  topic: "Safety",
  difficulty: "Beginner",
  order,
  explanation: "A safe choice",
  status: "Published",
  options: ["Unsafe", "Safe"],
  correctIndex: 1,
});
type Attempt = {
  id: string;
  status: string;
  questions: {
    id: string;
    options: { id: string }[];
    correctOptionId: string | null;
    selectedOptionId: string | null;
  }[];
  scorePercent: number | null;
  correct: number | null;
};
describe("Quiz database contracts", () => {
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
    ]) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      "insert into auth.users(id,email) values ($1,'admin@test.invalid'),($2,'alice@test.invalid'),($3,'bob@test.invalid')",
      [admin, alice, bob],
    );
    await db.query("update public.profiles set role='super_admin' where id=$1", [admin]);
  }, 60000);
  beforeEach(async () => {
    await db.exec("begin");
    await as(admin);
    await query("select public.save_learning_record('topics',$1::jsonb)", [
      JSON.stringify({ id: "topic-test", name: "Safety", slug: "safety", status: "Active" }),
    ]);
    await query("select public.save_learning_record('modules',$1::jsonb)", [
      JSON.stringify({
        id: "m-test",
        topicId: "topic-test",
        topic: "Safety",
        title: "Safety module",
        description: "Practical guidance",
        difficulty: "Beginner",
        minutes: 10,
        order: 1,
        status: "Published",
        objectives: ["Choose safe actions"],
        quizId: "",
      }),
    ]);
    await query("select public.quiz_save_definition($1::jsonb)", [JSON.stringify(quiz)]);
    await query("select public.quiz_save_question($1::jsonb)", [
      JSON.stringify(question("qn-1", 1)),
    ]);
    await query("select public.quiz_save_question($1::jsonb)", [
      JSON.stringify(question("qn-2", 2)),
    ]);
  });
  afterEach(async () => {
    await db.exec("reset role; rollback");
  });
  afterAll(async () => {
    await db.close();
  });

  it("hides answer tables and administrator RPCs from learners", async () => {
    await as(alice);
    await expect(query("select * from public.quiz_options")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(query("select * from public.quiz_attempt_items")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(query("select public.quiz_admin_questions(null)")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      query("select public.quiz_save_definition($1::jsonb)", [JSON.stringify(quiz)]),
    ).rejects.toMatchObject({ code: "42501" });
    await as(null);
    expect(await query("select id from public.quiz_definitions")).toHaveLength(1);
  });
  it("delivers random snapshots without correct answers, scores on the server and blocks replay", async () => {
    await as(alice);
    const start = await rpc<Attempt>("quiz_start", [quiz.id], "");
    expect(start.questions).toHaveLength(2);
    expect(start.questions.every((q) => q.correctOptionId === null)).toBe(true);
    expect((await rpc<Attempt>("quiz_start", [quiz.id], "")).id).toBe(start.id);
    const first = start.questions[0]!;
    const answered = await rpc<Attempt>(
      "quiz_answer",
      [start.id, first.id, first.options[1]!.id],
      "",
    );
    expect(answered.questions[0]!.correctOptionId).not.toBeNull();
    await expect(
      rpc("quiz_answer", [start.id, first.id, first.options[0]!.id], ""),
    ).rejects.toMatchObject({ code: "PT409" });
    const result = await rpc<Attempt>("quiz_submit", [start.id], "");
    expect(result.status).toBe("submitted");
    expect(result.scorePercent).toBe(50);
    expect((await rpc<Attempt>("quiz_submit", [start.id], "")).scorePercent).toBe(50);
    await as(bob);
    await expect(rpc("quiz_attempt", [start.id], "")).rejects.toMatchObject({ code: "P0002" });
  });
  it("enforces attempt limits and freezes expired results", async () => {
    await as(alice);
    const first = await rpc<Attempt>("quiz_start", [quiz.id], "");
    await rpc<Attempt>("quiz_submit", [first.id], "");
    const second = await rpc<Attempt>("quiz_start", [quiz.id], "");
    await db.exec("reset role");
    await query(
      "update public.quiz_attempts set deadline_at=now()-interval '1 second' where id=$1",
      [second.id],
    );
    await as(alice);
    const expired = await rpc<Attempt>("quiz_attempt", [second.id], "");
    expect(expired.status).toBe("expired");
    expect(expired.scorePercent).toBe(0);
    await expect(rpc("quiz_start", [quiz.id], "")).rejects.toMatchObject({ code: "PT409" });
  });
  it("protects drafts and scores and reports verified administrator totals", async () => {
    await query("select public.quiz_save_definition($1::jsonb)", [
      JSON.stringify({ ...quiz, version: 1, status: "Draft" }),
    ]);
    await as(alice);
    expect(await query("select id from public.quiz_definitions where id='q-test'")).toEqual([]);
    await expect(rpc("quiz_start", [quiz.id], "")).rejects.toMatchObject({ code: "P0002" });
    await as(admin);
    await query("select public.quiz_save_definition($1::jsonb)", [
      JSON.stringify({ ...quiz, version: 2 }),
    ]);
    await as(alice);
    const attempt = await rpc<Attempt>("quiz_start", [quiz.id], "");
    await rpc<Attempt>("quiz_submit", [attempt.id], "");
    await expect(
      query("update public.quiz_attempts set score_percent=100 where id=$1", [attempt.id]),
    ).rejects.toMatchObject({ code: "42501" });
    await as(admin);
    const summary = await rpc<{
      attempts: number;
      averageScore: number;
      publishedQuestions: number;
    }>("quiz_admin_summary", [], "");
    expect(summary).toMatchObject({ attempts: 1, averageScore: 0, publishedQuestions: 2 });
  });
  it("imports the bundled quizzes idempotently without changing existing records", async () => {
    const learningSeed = (await readFile("supabase/learning-seed.sql", "utf8")).replace(
      /^begin;|^commit;/gm,
      "",
    );
    const quizSeed = (await readFile("supabase/quiz-seed.sql", "utf8")).replace(
      /^begin;|^commit;/gm,
      "",
    );
    await db.exec(learningSeed);
    await db.exec("reset role");
    await db.exec(quizSeed);
    await db.exec(quizSeed);
    expect(
      (await query<{ count: number }>("select count(*)::int count from public.quiz_definitions"))[0]
        ?.count,
    ).toBe(6);
    expect(
      (await query<{ count: number }>("select count(*)::int count from public.quiz_questions"))[0]
        ?.count,
    ).toBe(50);
    expect(
      (
        await query<{ count: number }>(
          "select count(*)::int count from public.quiz_options where question_id='m-fundamentals-qn-01'",
        )
      )[0]?.count,
    ).toBeGreaterThan(1);
  });
});
