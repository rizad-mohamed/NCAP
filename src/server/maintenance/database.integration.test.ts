// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
async function as(role: string, user = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${role}`);
}

describe("operator maintenance Data API prerequisites", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema private;
      revoke all on schema private from public;
      grant usage on schema private to anon,authenticated;
      grant usage on schema auth to anon,authenticated,service_role;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
      grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
      create table public.profiles(id uuid primary key,status text);
      insert into public.profiles values('00000000-0000-4000-8000-000000000001','active'),('00000000-0000-4000-8000-000000000002','suspended');
      create function private.unrelated_operator_function() returns int language sql as $$ select 1 $$;
      revoke all on function private.unrelated_operator_function() from public,anon,authenticated,service_role;`);
    const guard = await readFile(
      "supabase/migrations/202609300004_admin_users_request_guard.sql",
      "utf8",
    );
    await db.exec(
      guard.replace(/alter role authenticator set pgrst\.db_pre_request[^;]+;\s*/i, ""),
    );
    await db.exec(
      await readFile("supabase/migrations/202610030003_public_request_guard.sql", "utf8"),
    );
    await as("service_role");
    await expect(db.query("select private.check_active_account_request()")).rejects.toThrow(
      "permission denied for schema private",
    );
    await db.exec("reset role");
    await db.exec(
      await readFile(
        "supabase/migrations/202610030007_maintenance_request_permissions.sql",
        "utf8",
      ),
    );
  }, 30000);
  afterEach(async () => {
    await db.exec("reset role");
  });
  afterAll(async () => {
    await db.close();
  });

  it("allows the server maintenance role to execute the existing request guard", async () => {
    await as("service_role");
    await expect(db.query("select private.check_active_account_request()")).resolves.toMatchObject({
      rows: [{ check_active_account_request: "" }],
    });
  });
  it("preserves active-account checks and anonymous request behavior", async () => {
    await as("authenticated", "00000000-0000-4000-8000-000000000002");
    await expect(db.query("select private.check_active_account_request()")).rejects.toThrow(
      "Account unavailable",
    );
    await as("authenticated", "00000000-0000-4000-8000-000000000001");
    await expect(db.query("select private.check_active_account_request()")).resolves.toMatchObject({
      rows: [{ check_active_account_request: "" }],
    });
    await as("anon");
    await expect(db.query("select private.check_active_account_request()")).resolves.toMatchObject({
      rows: [{ check_active_account_request: "" }],
    });
  });
  it("does not grant execution of unrelated private functions", async () => {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('service_role','private.unrelated_operator_function()','EXECUTE') as allowed",
    );
    expect(result.rows).toEqual([{ allowed: false }]);
    await as("service_role");
    await expect(db.query("select private.unrelated_operator_function()")).rejects.toThrow(
      "permission denied for function unrelated_operator_function",
    );
  });
});
