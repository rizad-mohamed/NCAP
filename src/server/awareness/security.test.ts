import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync("supabase/migrations/202609200001_awareness.sql", "utf8");
describe("Awareness migration security contract (static, not a live RLS audit)", () => {
  it("maps stale edits to non-retryable HTTP conflicts", () => {
    const fix = readFileSync("supabase/migrations/202609260001_awareness_conflicts.sql", "utf8");
    expect(fix).not.toContain("40001");
    expect(fix.match(/'PT409'/g)).toHaveLength(3);
    expect(fix.match(/if not private.is_super_admin\(\)/g)).toHaveLength(2);
    expect(fix.match(/security invoker/g)).toHaveLength(2);
  });
  it("keeps the scheduled cleanup entry point private and its token in Vault", () => {
    const job = readFileSync("supabase/operations/awareness-cleanup.sql", "utf8");
    expect(job).toContain(
      "revoke all on function private.run_awareness_cleanup() from public,anon,authenticated",
    );
    expect(job).toContain("vault.decrypted_secrets");
    expect(job).toContain("'17 * * * *'");
    const handler = readFileSync("supabase/functions/awareness-cleanup/index.js", "utf8");
    expect(handler).toContain("await authorized(request)");
    expect(handler).toContain("status: 401");
    expect(handler).toContain("maxAssets: 100");
  });
  it.each(["awareness_resources", "awareness_media_assets"])(
    "enables RLS and denies default writes on %s",
    (table) => {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
      expect(sql).toMatch(
        /revoke all on public.awareness_resources, public.awareness_media_assets from anon, authenticated/,
      );
    },
  );
  it("restricts public records and media to published parents", () => {
    expect(sql).toMatch(/awareness_public_read[\s\S]*?using \(status = 'Published'\)/);
    expect(sql).toMatch(
      /awareness_media_public_read[\s\S]*?state = 'active'[\s\S]*?r.status = 'Published'[\s\S]*?r.image_id = awareness_media_assets.id/,
    );
  });
  it("uses authoritative role policies and invoker mutation functions", () => {
    expect(sql).toMatch(
      /awareness_admin[\s\S]*?for all to authenticated[\s\S]*?private.is_super_admin/,
    );
    expect(sql.match(/if not private.is_super_admin\(\)/g)).toHaveLength(2);
    expect(sql).not.toContain("security definer");
    expect(sql).not.toMatch(/raw_user_meta_data|service_role/);
  });
  it("protects storage uploads and refuses overwriting validated objects", () => {
    expect(sql).toContain("'awareness-media','awareness-media',false,104857600");
    expect(sql).toMatch(
      /awareness_storage_upload[\s\S]*?a.state='pending'[\s\S]*?a.uploaded_by=\(select auth.uid\(\)\)/,
    );
    expect(sql).not.toMatch(/on storage.objects for update/i);
    expect(sql).toMatch(
      /awareness_storage_delete[\s\S]*?a.state in \('pending','ready','retired'\)/,
    );
    expect(sql).not.toContain("image/svg+xml");
  });
  it("includes integrity, lookup, search, and cleanup indexes", () => {
    for (const name of [
      "awareness_list_idx",
      "awareness_topic_idx",
      "awareness_newest_idx",
      "awareness_search_idx",
      "awareness_document_idx",
      "awareness_asset_resource_idx",
      "awareness_cleanup_idx",
    ])
      expect(sql).toContain(`create index ${name}`);
    expect(sql).toContain("unique(kind, slug)");
    expect(sql).toContain("on delete restrict");
    expect(sql).toContain("display_order between 0 and 1000000");
  });
  it("locks resources and assets and retires old media only after the resource transaction", () => {
    expect(sql).toMatch(/where id = next_row.id for update/);
    expect(sql).toMatch(/where id = asset_id for update/);
    expect(sql).toContain("old_row.version <> expected_version");
    expect(sql.indexOf("returning * into next_row")).toBeLessThan(
      sql.indexOf("set state='retired'"),
    );
    expect(sql).toContain("id is distinct from next_row.image_id");
  });
  it("removes Awareness from browser hydration and persistence", () => {
    const store = readFileSync("src/state/ncap-store.tsx", "utf8");
    expect(store).not.toContain('from "@/data/awareness"');
    const validation = readFileSync("src/domain/validation.ts", "utf8");
    expect(validation).not.toContain("articles: z.array(recordWithId)");
    const page = readFileSync("src/features/admin/AdminAwarenessPage.tsx", "utf8");
    expect(page).not.toContain("DemoMediaService");
    expect(page).toContain('storage="awareness"');
  });
});
