// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";

const admin = "00000000-0000-4000-8000-000000000001";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
let db: PGlite;

async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await db.exec("savepoint certificate_statement");
  try {
    const rows = (await db.query<T>(sql, params)).rows;
    await db.exec("release savepoint certificate_statement");
    return rows;
  } catch (error) {
    await db.exec(
      "rollback to savepoint certificate_statement; release savepoint certificate_statement",
    );
    throw error;
  }
}
async function as(user: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [
    user ? "authenticated" : "anon",
  ]);
  await db.exec(user ? "set role authenticated" : "set role anon");
}

describe("certificate registry, reports, transactions and RLS", () => {
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
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const users = await readFile("supabase/migrations/202609300003_admin_users.sql", "utf8");
    await db.exec(
      users
        .replace(/create extension if not exists pg_trgm with schema extensions;\s*/i, "")
        .replace(/create index if not exists profiles_email_search[^;]+;\s*/i, "")
        .replace(/create index if not exists profiles_name_search[^;]+;\s*/i, ""),
    );
    await db.exec(await readFile("supabase/migrations/202610030001_certificates.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/202610030002_admin_reports.sql", "utf8"));
    // The existing Awareness mutation table is represented here to exercise the
    // new audit trigger and actual database grants/RLS without its search extension.
    await db.exec(`create table public.awareness_resources(id uuid primary key default gen_random_uuid(),title text not null,status text not null default 'Draft',version integer not null default 1);
      alter table public.awareness_resources enable row level security;
      grant select,insert,update,delete on public.awareness_resources to authenticated;
      create policy awareness_admin on public.awareness_resources for all to authenticated using(private.is_super_admin()) with check(private.is_super_admin());`);
    await db.exec(
      await readFile("supabase/migrations/202610030004_admin_content_audit.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202610030005_publication_eligibility.sql", "utf8"),
    );
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values ($1,'admin@test.invalid','{\"display_name\":\"Administrator\"}'),($2,'alice@test.invalid','{\"display_name\":\"Alice Learner\"}'),($3,'bob@test.invalid','{\"display_name\":\"Bob Learner\"}')",
      [admin, alice, bob],
    );
    await db.query("update public.profiles set role='super_admin' where id=$1", [admin]);
    await db.exec(`insert into public.learning_topics(id,name,slug,status) values('t-safe','Safety','safety','Active');
      insert into public.learning_modules(id,topic_id,title,description,difficulty,minutes,display_order,status,quiz_id)
        values('m-safe','t-safe','Safe accounts','Account protection','Beginner',10,1,'Published','q-safe');
      insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status)
        values('l-safe','m-safe','t-safe','Safe passwords','Use a passphrase','Beginner',10,1,'Published');
      insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,passing_percent,eligibility_percent,question_count,status)
        values('q-safe','m-safe','Safety quiz','safety-quiz','Assessment','Safety','Beginner',70,80,1,'Published');`);
  }, 60000);
  beforeEach(async () => {
    await db.exec("begin");
    await db.query(
      "insert into public.learning_completions(user_id,lesson_id,completed_at) values($1,'l-safe',now()-interval '1 day')",
      [alice],
    );
    await db.query(
      `insert into public.quiz_attempts(user_id,quiz_id,attempt_number,started_at,deadline_at,completed_at,status,correct_count,total_count,score_percent,passed)
      values($1,'q-safe',1,now()-interval '2 days',now()-interval '2 days'+interval '10 minutes',now()-interval '2 days'+interval '5 minutes','submitted',9,10,90,true)`,
      [alice],
    );
  });
  afterEach(async () => {
    await db.exec("reset role; rollback");
  });
  afterAll(async () => {
    await db.close();
  });

  it("denies anonymous and learner mutations while exposing only the learner's rows", async () => {
    await as(null);
    await expect(query("select public.certificate_registry()")).rejects.toMatchObject({
      code: "42501",
    });
    expect(
      (
        await query<{ result: { valid: boolean } }>(
          "select public.certificate_verify('00000000-0000-4000-8000-000000000000') result",
        )
      )[0]?.result.valid,
    ).toBe(false);
    await as(alice);
    const registry = (
      await query<{
        result: {
          total: number;
          issuedCount: number;
          items: { userId: string; eligibility: { eligible: boolean } }[];
        };
      }>("select public.certificate_registry() result")
    )[0]!.result;
    expect(registry).toMatchObject({ total: 1, issuedCount: 0 });
    expect(registry.items[0]).toMatchObject({ userId: alice, eligibility: { eligible: true } });
    await expect(
      query("select public.certificate_issue($1,'m-safe')", [alice]),
    ).rejects.toMatchObject({ code: "42501" });
    expect(await query("select * from public.certificate_templates")).toEqual([]);
    expect(await query("select * from public.certificate_audit")).toEqual([]);
  });

  it("issues once from locked authoritative evidence and preserves the issuance snapshot", async () => {
    await as(admin);
    const first = (
      await query<{
        result: {
          id: string;
          reference: string;
          evidence: { bestScore: number; lessons: unknown[] };
        };
      }>("select public.certificate_issue($1,'m-safe') result", [alice])
    )[0]!.result;
    const duplicate = (
      await query<{ result: { id: string } }>(
        "select public.certificate_issue($1,'m-safe') result",
        [alice],
      )
    )[0]!.result;
    expect(duplicate.id).toBe(first.id);
    expect(first.evidence).toMatchObject({ bestScore: 90 });
    expect(first.evidence.lessons).toHaveLength(1);
    expect(
      (await query<{ count: number }>("select count(*)::int count from public.certificates"))[0]!
        .count,
    ).toBe(1);
    expect(
      (
        await query<{ count: number }>(
          "select count(*)::int count from public.certificate_audit where action='issued'",
        )
      )[0]!.count,
    ).toBe(1);
    await db.exec("reset role");
    await db.exec(
      "delete from public.learning_completions where user_id='00000000-0000-4000-8000-000000000002'",
    );
    await as(alice);
    const document = (
      await query<{ result: { evidence: { eligible: boolean; completionPercent: number } } }>(
        "select public.certificate_document($1) result",
        [first.id],
      )
    )[0]!.result;
    expect(document.evidence).toMatchObject({ eligible: true, completionPercent: 100 });
    await as(bob);
    await expect(query("select public.certificate_document($1)", [first.id])).rejects.toMatchObject(
      { code: "P0002" },
    );
  });

  it("uses published lessons consistently for administrator eligibility and report capacity", async () => {
    await db.exec(`insert into public.learning_lessons(id,module_id,topic_id,title,summary,difficulty,minutes,display_order,status)
      values('l-draft','m-safe','t-safe','Unfinished draft','Draft content','Beginner',10,2,'Draft');`);
    await as(admin);
    const registry = (
      await query<{
        result: {
          items: { userId: string; eligibility: { eligible: boolean; lessons: unknown[] } }[];
        };
      }>("select public.certificate_registry() result")
    )[0]!.result;
    expect(registry.items.find((row) => row.userId === alice)!.eligibility).toMatchObject({
      eligible: true,
      lessons: [expect.objectContaining({ id: "l-safe" })],
    });
    const report = (
      await query<{ result: { completionRate: number } }>(
        "select public.admin_content_report(30,'m-safe',null,0) result",
      )
    )[0]!.result;
    expect(report.completionRate).toBe(50);
    await db.exec(
      "reset role; update public.learning_modules set status='Draft' where id='m-safe';",
    );
    await as(admin);
    await expect(
      query("select public.certificate_issue($1,'m-safe')", [alice]),
    ).rejects.toMatchObject({ code: "22023" });
  });

  it("revokes without deleting history and public verification returns a safe invalid state", async () => {
    await as(admin);
    const issued = (
      await query<{ result: { id: string; reference: string } }>(
        "select public.certificate_issue($1,'m-safe') result",
        [alice],
      )
    )[0]!.result;
    await as(alice);
    await expect(
      query("select public.certificate_revoke($1,'learner request')", [issued.id]),
    ).rejects.toMatchObject({ code: "42501" });
    await as(admin);
    await query("select public.certificate_revoke($1,'Incorrect identity')", [issued.id]);
    expect(
      (
        await query<{ status: string; revocation_reason: string }>(
          "select status,revocation_reason from public.certificates where id=$1",
          [issued.id],
        )
      )[0],
    ).toEqual({ status: "Revoked", revocation_reason: "Incorrect identity" });
    expect(
      (
        await query<{ count: number }>(
          "select count(*)::int count from public.certificate_audit where certificate_id=$1",
          [issued.id],
        )
      )[0]!.count,
    ).toBe(2);
    await as(null);
    expect(
      (
        await query<{ result: Record<string, unknown> }>(
          "select public.certificate_verify($1) result",
          [issued.reference],
        )
      )[0]!.result,
    ).toEqual({
      valid: false,
      status: "Revoked",
      reference: issued.reference,
      moduleTitle: "Safe accounts",
      issuer: "NCAP Sri Lanka",
      issuedAt: expect.any(String),
    });
  });

  it("audits Awareness CRUD transactionally and denies audit tampering or learner reads", async () => {
    await as(admin);
    const id = "00000000-0000-4000-8000-000000000020";
    await query("insert into public.awareness_resources(id,title) values($1,'Safe publishing')", [
      id,
    ]);
    await query("update public.awareness_resources set status='Published',version=2 where id=$1", [
      id,
    ]);
    await query("delete from public.awareness_resources where id=$1", [id]);
    const audit = await query<{
      action: string;
      actor_id: string;
      before_data: { status: string } | null;
      after_data: { status: string } | null;
    }>(
      "select action,actor_id,before_data,after_data from public.awareness_audit where resource_id=$1 order by id",
      [id],
    );
    expect(audit.map((row) => row.action)).toEqual(["create", "update", "delete"]);
    expect(audit.every((row) => row.actor_id === admin)).toBe(true);
    expect(audit[1]).toMatchObject({
      before_data: { status: "Draft" },
      after_data: { status: "Published" },
    });
    await expect(query("delete from public.awareness_audit")).rejects.toMatchObject({
      code: "42501",
    });
    await as(alice);
    expect(await query("select * from public.awareness_audit")).toEqual([]);
    await expect(
      query("insert into public.awareness_resources(title) values('Forged')"),
    ).rejects.toMatchObject({ code: "42501" });
    await as(null);
    await expect(query("select * from public.awareness_audit")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("paginates report attempts while exporting every matching row", async () => {
    await db.query(
      `insert into public.quiz_attempts(user_id,quiz_id,attempt_number,started_at,deadline_at,completed_at,status,correct_count,total_count,score_percent,passed)
      select $1,'q-safe',n,now()-interval '1 hour',now()-interval '50 minutes',now()-interval '55 minutes'+n*interval '1 second','submitted',9,10,90,true from generate_series(1,105) n`,
      [bob],
    );
    await as(admin);
    const page = async (offset: number) =>
      (
        await query<{ result: { attemptCount: number; attempts: { id: string }[] } }>(
          "select public.admin_content_report(30,'m-safe','q-safe',$1) result",
          [offset],
        )
      )[0]!.result;
    const first = await page(0);
    const second = await page(100);
    expect(first.attemptCount).toBe(106);
    expect(first.attempts).toHaveLength(100);
    expect(second.attempts).toHaveLength(6);
    expect(new Set([...first.attempts, ...second.attempts].map((row) => row.id)).size).toBe(106);
    const exported = (
      await query<{ result: { id: string }[] }>(
        "select public.admin_content_report_export(30,'m-safe','q-safe') result",
      )
    )[0]!.result;
    expect(exported).toHaveLength(106);
    expect(new Set(exported.map((row) => row.id)).size).toBe(106);
  });

  it("checks template versions and reports only authoritative filtered data", async () => {
    await as(admin);
    const template = (
      await query<{ result: Record<string, unknown> }>(
        "select public.certificate_template_get() result",
      )
    )[0]!.result;
    const updated = { ...template, title: "NCAP Completion Award" };
    await query("select public.certificate_template_save($1::jsonb,1)", [JSON.stringify(updated)]);
    await expect(
      query("select public.certificate_template_save($1::jsonb,1)", [JSON.stringify(updated)]),
    ).rejects.toMatchObject({ code: "PT409" });
    const report = (
      await query<{
        result: {
          attemptCount: number;
          averageScore: number;
          completedLessons: number;
          publishedQuizzes: number;
        };
      }>("select public.admin_content_report(30,'m-safe','q-safe',0) result")
    )[0]!.result;
    expect(report).toMatchObject({
      attemptCount: 1,
      averageScore: 90,
      completedLessons: 1,
      publishedQuizzes: 1,
    });
    const exported = (
      await query<{ result: unknown[] }>(
        "select public.admin_content_report_export(30,'m-safe','q-safe') result",
      )
    )[0]!.result;
    expect(exported).toHaveLength(1);
    await as(alice);
    await expect(query("select public.admin_content_report(30,null,null,0)")).rejects.toMatchObject(
      { code: "42501" },
    );
  });
});
