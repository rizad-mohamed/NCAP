// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { describe, it, expect } from "vitest";
const env = process.env;
const enabled =
  env["AWARENESS_INTEGRATION"] === "1" &&
  [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "E2E_ADMIN_EMAIL",
    "E2E_ADMIN_PASSWORD",
    "E2E_LEARNER_EMAIL",
    "E2E_LEARNER_PASSWORD",
  ].every((key) => env[key]);
describe.skipIf(!enabled)(
  "LIVE Awareness RLS (requires migrated disposable Supabase and two test users)",
  () => {
    it("enforces draft isolation, learner denial, publication, versioning, and deletion", async () => {
      const make = () =>
        createClient(env["SUPABASE_URL"]!, env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      const admin = make(),
        learner = make(),
        anonymous = make();
      expect(
        (
          await admin.auth.signInWithPassword({
            email: env["E2E_ADMIN_EMAIL"]!,
            password: env["E2E_ADMIN_PASSWORD"]!,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await learner.auth.signInWithPassword({
            email: env["E2E_LEARNER_EMAIL"]!,
            password: env["E2E_LEARNER_PASSWORD"]!,
          })
        ).error,
      ).toBeNull();
      const id = crypto.randomUUID();
      const payload = {
        id,
        kind: "cyberTips",
        slug: `rls-${id}`,
        title: "RLS test",
        summary: "Test isolated content",
        topic: "MFA",
        language: "en",
        status: "Draft",
        display_order: 0,
        featured: false,
        published_at: "2026-08-01",
        author: "Integration",
        tags: [],
        content: {},
      };
      try {
        expect((await anonymous.from("awareness_resources").insert(payload)).error).not.toBeNull();
        expect((await learner.rpc("save_awareness_resource", { payload })).error).not.toBeNull();
        const created = await admin.rpc("save_awareness_resource", { payload });
        expect(created.error).toBeNull();
        for (const reader of [anonymous, learner]) {
          const result = await reader.from("awareness_resources").select("*").eq("id", id);
          expect(result.error).toBeNull();
          expect(result.data).toEqual([]);
          expect(
            (await reader.from("awareness_resources").select("*").eq("slug", payload.slug)).data,
          ).toEqual([]);
        }
        expect(
          (await admin.from("awareness_resources").select("id").eq("id", id)).data,
        ).toHaveLength(1);
        expect(
          (
            await learner
              .from("awareness_resources")
              .update({ status: "Published" })
              .eq("id", id)
              .select()
          ).data,
        ).toEqual([]);
        expect(
          (
            await admin.rpc("save_awareness_resource", {
              payload: { ...payload, status: "Published" },
              expected_version: 1,
            })
          ).error,
        ).toBeNull();
        expect(
          (await anonymous.from("awareness_resources").select("id").eq("id", id)).data,
        ).toHaveLength(1);
        expect(
          (await admin.rpc("save_awareness_resource", { payload, expected_version: 1 })).error
            ?.code,
        ).toBe("40001");
        expect(
          (await admin.rpc("save_awareness_resource", { payload, expected_version: 2 })).error,
        ).toBeNull();
        expect(
          (await anonymous.from("awareness_resources").select("id").eq("id", id)).data,
        ).toEqual([]);
        expect(
          (await learner.rpc("delete_awareness_resource", { resource: id, expected_version: 3 }))
            .error,
        ).not.toBeNull();
        expect(
          (await admin.rpc("delete_awareness_resource", { resource: id, expected_version: 3 }))
            .error,
        ).toBeNull();
      } finally {
        const row = await admin
          .from("awareness_resources")
          .select("version")
          .eq("id", id)
          .maybeSingle();
        if (row.data)
          await admin.rpc("delete_awareness_resource", {
            resource: id,
            expected_version: row.data.version,
          });
        await Promise.all([admin.auth.signOut(), learner.auth.signOut()]);
      }
    }, 60000);
    it("enforces private draft Storage and published-parent media access", async () => {
      const make = () =>
        createClient(env["SUPABASE_URL"]!, env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      const admin = make(),
        learner = make(),
        anonymous = make();
      const login = await admin.auth.signInWithPassword({
        email: env["E2E_ADMIN_EMAIL"]!,
        password: env["E2E_ADMIN_PASSWORD"]!,
      });
      expect(login.error).toBeNull();
      expect(
        (
          await learner.auth.signInWithPassword({
            email: env["E2E_LEARNER_EMAIL"]!,
            password: env["E2E_LEARNER_PASSWORD"]!,
          })
        ).error,
      ).toBeNull();
      const resource = crypto.randomUUID(),
        asset = crypto.randomUUID();
      const path = `${login.data.user!.id}/${crypto.randomUUID()}.png`;
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2m3sAAAAASUVORK5CYII=",
        "base64",
      );
      const payload = {
        id: resource,
        kind: "posters",
        slug: `storage-${resource}`,
        title: "Storage test",
        summary: "Private media",
        topic: "MFA",
        language: "en",
        status: "Draft",
        display_order: 0,
        featured: false,
        published_at: null,
        author: "Integration",
        tags: [],
        content: { format: "PNG" },
        image_id: asset,
      };
      try {
        expect(
          (
            await admin
              .from("awareness_media_assets")
              .insert({
                id: asset,
                path,
                role: "image",
                file_name: "poster.png",
                mime_type: "image/png",
                size_bytes: png.length,
                width: 1,
                height: 1,
                alt_text: "Test",
                uploaded_by: login.data.user!.id,
              })
          ).error,
        ).toBeNull();
        for (const client of [anonymous, learner])
          expect(
            (
              await client.storage
                .from("awareness-media")
                .upload(path, png, { contentType: "image/png" })
            ).error,
          ).not.toBeNull();
        expect(
          (
            await admin.storage
              .from("awareness-media")
              .upload(path, png, { contentType: "image/png", upsert: false })
          ).error,
        ).toBeNull();
        expect(
          (await admin.from("awareness_media_assets").update({ state: "ready" }).eq("id", asset))
            .error,
        ).toBeNull();
        expect((await admin.rpc("save_awareness_resource", { payload })).error).toBeNull();
        expect(
          (await anonymous.from("awareness_media_assets").select("*").eq("id", asset)).data,
        ).toEqual([]);
        expect(
          (await anonymous.storage.from("awareness-media").createSignedUrl(path, 60)).error,
        ).not.toBeNull();
        expect(
          (await admin.storage.from("awareness-media").createSignedUrl(path, 60)).error,
        ).toBeNull();
        expect(
          (
            await admin.rpc("save_awareness_resource", {
              payload: { ...payload, status: "Published" },
              expected_version: 1,
            })
          ).error,
        ).toBeNull();
        expect(
          (await anonymous.storage.from("awareness-media").createSignedUrl(path, 60)).error,
        ).toBeNull();
        expect(
          (await learner.from("awareness_media_assets").delete().eq("id", asset).select()).data,
        ).toEqual([]);
        await learner.storage.from("awareness-media").remove([path]);
        expect((await admin.storage.from("awareness-media").info(path)).error).toBeNull();
        expect(
          (await admin.rpc("save_awareness_resource", { payload, expected_version: 2 })).error,
        ).toBeNull();
        expect(
          (await anonymous.storage.from("awareness-media").createSignedUrl(path, 60)).error,
        ).not.toBeNull();
      } finally {
        const row = await admin
          .from("awareness_resources")
          .select("version")
          .eq("id", resource)
          .maybeSingle();
        if (row.data)
          await admin.rpc("delete_awareness_resource", {
            resource,
            expected_version: row.data.version,
          });
        await admin.from("awareness_media_assets").update({ state: "retired" }).eq("id", asset);
        await admin.storage.from("awareness-media").remove([path]);
        await admin.from("awareness_media_assets").delete().eq("id", asset);
        await Promise.all([admin.auth.signOut(), learner.auth.signOut()]);
      }
    }, 60000);
  },
);
