import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609190001_auth_profiles.sql"),
  "utf8",
);

describe("Supabase authorization migration", () => {
  it("enables RLS and limits profile updates to safe columns", () => {
    expect(migration).toMatch(/alter table public\.profiles enable row level security/i);
    expect(migration).toMatch(
      /grant update \(display_name, language, phone, notifications\) on table public\.profiles to authenticated/i,
    );
    expect(migration).not.toMatch(/grant update \([^)]*role[^)]*\)/i);
  });

  it("creates every account as a learner without trusting role metadata", () => {
    expect(migration).toMatch(/role public\.app_role not null default 'learner'/i);
    expect(migration).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/i);
  });

  it("hardens privilege-checking functions and protects role assignment", () => {
    expect(migration).toMatch(
      /function private\.is_super_admin\(\)[\s\S]*security definer[\s\S]*set search_path = ''/i,
    );
    expect(migration).toMatch(/revoke all on table public\.profiles from anon, authenticated/i);
    expect(migration).toMatch(/revoke all on function private\.handle_new_auth_user\(\)/i);
  });
});
