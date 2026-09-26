import { describe, expect, it, vi } from "vitest";
import type { AwarenessClient } from "./authorization";
import { requireAwarenessAdmin } from "./authorization";
import { listResources, getResource } from "./queries";
import { saveResource, deleteResource } from "./service";
import { awarenessResult, databaseError } from "./errors";
import { cleanupMedia, prepareMedia, retireMedia, finishMedia, mediaUrl } from "./media";
const id = "00000000-0000-4000-a000-000000000001";
const record = {
  id,
  slug: "secure-tip",
  title: "Secure tip",
  topic: "MFA",
  text: "Use an authenticator.",
  status: "Draft",
  order: 1,
  version: 2,
};
type Reply = { data?: unknown; error?: { code?: string } | null; count?: number };
function mockClient(replies: Record<string, Reply[]> = {}, role = "super_admin") {
  const calls: [string, string, unknown[]][] = [];
  const storage = {
    createSignedUploadUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://storage.example/upload" }, error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://storage.example/display" }, error: null }),
    info: vi.fn().mockResolvedValue({ data: { size: 32, contentType: "image/png" }, error: null }),
  };
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: role === "anonymous" ? null : { id } }, error: null }),
    },
    from(table: string) {
      const result = () =>
        replies[table]?.shift() ??
        (table === "profiles" ? { data: { role }, error: null } : { data: [], error: null });
      const chain: unknown = new Proxy(
        {},
        {
          get(_target, method: string) {
            if (method === "then")
              return (resolve: (v: Reply) => unknown) => Promise.resolve(result()).then(resolve);
            return (...args: unknown[]) => {
              calls.push([table, method, args]);
              return chain;
            };
          },
        },
      );
      return chain;
    },
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    storage: { from: vi.fn().mockReturnValue(storage) },
  };
  return { client: client as unknown as AwarenessClient, raw: client, calls, storage };
}
describe("Awareness reads and authorization", () => {
  it("explicitly excludes drafts in public lists even for an administrator", async () => {
    const { client, calls } = mockClient();
    await listResources(client, {
      kind: "articles",
      search: "100%_safe",
      topic: "MFA",
      sort: "newest",
      offset: 24,
      limit: 24,
    });
    expect(calls).toContainEqual(["awareness_resources", "eq", ["status", "Published"]]);
    expect(calls).toContainEqual([
      "awareness_resources",
      "ilike",
      ["search_text", "%100\\%\\_safe%"],
    ]);
    expect(calls).toContainEqual(["awareness_resources", "range", [24, 47]]);
    expect(calls).toContainEqual([
      "awareness_resources",
      "order",
      ["published_at", { ascending: false, nullsFirst: false }],
    ]);
  });
  it("restricts guessed slug and ID detail reads", async () => {
    for (const key of [id, "private-draft"]) {
      const { client, calls } = mockClient({ awareness_resources: [{ data: null, error: null }] });
      expect(await getResource(client, "articles", key)).toBeNull();
      expect(calls).toContainEqual(["awareness_resources", "eq", ["status", "Published"]]);
    }
  });
  it("allows authorized administrator draft lists", async () => {
    const { client, calls } = mockClient();
    await listResources(client, { kind: "articles", admin: true });
    expect(calls).toContainEqual(["profiles", "eq", ["id", id]]);
    expect(calls).not.toContainEqual(["awareness_resources", "eq", ["status", "Published"]]);
  });
  it.each(["learner", "anonymous"])("denies %s privileged operations", async (role) => {
    const { client, raw } = mockClient({}, role);
    await expect(requireAwarenessAdmin(client)).rejects.toThrow();
    await expect(listResources(client, { kind: "articles", admin: true })).rejects.toThrow();
    await expect(saveResource(client, "cyberTips", record)).rejects.toThrow();
    await expect(deleteResource(client, id, 2)).rejects.toThrow();
    await expect(prepareMedia(client, {})).rejects.toThrow();
    expect(raw.rpc).not.toHaveBeenCalled();
  });
  it("normalizes database failures without leaking details", async () => {
    const error = await awarenessResult(async () => databaseError({ code: "XX000" }));
    expect(error).toEqual({
      ok: false,
      code: "server",
      message: "Awareness is temporarily unavailable. Please try again.",
    });
    expect(await awarenessResult(async () => databaseError({ code: "PT409" }))).toMatchObject({
      ok: false,
      code: "conflict",
    });
  });
});
describe("Awareness mutations and media lifecycle", () => {
  it.each(["Draft", "Published"])(
    "saves %s with the viewed version and preserved date",
    async (status) => {
      const { client, raw } = mockClient();
      await saveResource(client, "cyberTips", { ...record, status, publishedAt: "2026-08-01" });
      expect(raw.rpc).toHaveBeenCalledWith(
        "save_awareness_resource",
        expect.objectContaining({
          expected_version: 2,
          payload: expect.objectContaining({ status, published_at: "2026-08-01" }),
        }),
      );
    },
  );
  it("deletes through the versioned transaction", async () => {
    const { client, raw } = mockClient();
    await deleteResource(client, id, 2);
    expect(raw.rpc).toHaveBeenCalledWith("delete_awareness_resource", {
      resource: id,
      expected_version: 2,
    });
  });
  it("uses randomized paths and records pending metadata before upload authorization", async () => {
    const { client, calls, storage } = mockClient();
    await prepareMedia(client, {
      fileName: "friendly.png",
      mimeType: "image/png",
      sizeBytes: 32,
      width: 10,
      height: 10,
      altText: "A poster",
    });
    const inserted = calls.find((c) => c[1] === "insert")![2][0] as { path: string };
    expect(inserted.path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
    expect(inserted.path).not.toContain("friendly");
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(inserted.path, { upsert: false });
  });
  it("retains durable metadata when storage cleanup fails", async () => {
    const { client, calls, storage } = mockClient({
      awareness_media_assets: [{ data: [{ id, path: "object", created_at: "2020-01-01" }] }],
    });
    storage.remove.mockResolvedValue({ error: { message: "private detail" } });
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    await cleanupMedia(client);
    expect(calls.some((c) => c[1] === "delete")).toBe(false);
    expect(log).toHaveBeenCalledWith("Awareness media cleanup deferred.", { assetId: id });
    log.mockRestore();
  });
  it("removes storage before retiring metadata and retains recent upload tombstones", async () => {
    for (const created_at of ["2020-01-01", new Date().toISOString()]) {
      const { client, calls, storage } = mockClient({
        awareness_media_assets: [{ data: [{ id, path: "object", created_at }] }],
      });
      await cleanupMedia(client);
      expect(storage.remove).toHaveBeenCalledWith(["object"]);
      expect(calls.some((c) => c[1] === "delete")).toBe(created_at === "2020-01-01");
    }
  });
  it("cannot discard an attached asset", async () => {
    const { client, calls } = mockClient();
    await retireMedia(client, id);
    expect(calls).toContainEqual(["awareness_media_assets", "in", ["state", ["pending", "ready"]]]);
  });
  it("cleans an upload when object inspection fails", async () => {
    const { client, calls, storage } = mockClient({
      awareness_media_assets: [
        { data: { id, path: "object", size_bytes: 100, mime_type: "image/png" } },
      ],
    });
    storage.info.mockResolvedValue({ data: null, error: { message: "missing" } });
    await expect(finishMedia(client, id)).rejects.toThrow("size or type");
    expect(calls).toContainEqual(["awareness_media_assets", "in", ["state", ["pending", "ready"]]]);
  });
  it("does not issue URLs for inaccessible draft media", async () => {
    const { client, storage } = mockClient(
      { awareness_media_assets: [{ data: null, error: null }] },
      "anonymous",
    );
    await expect(mediaUrl(client, id)).rejects.toThrow("no longer available");
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
  it("finalizes a verified image before it can be attached", async () => {
    const png = new Uint8Array(32);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    png.set([73, 72, 68, 82], 12);
    new DataView(png.buffer).setUint32(16, 10);
    new DataView(png.buffer).setUint32(20, 10);
    const asset = {
      id,
      path: "object",
      role: "image",
      file_name: "poster.png",
      size_bytes: 32,
      mime_type: "image/png",
      width: 10,
      height: 10,
      alt_text: "Poster",
    };
    const { client, calls } = mockClient({
      awareness_media_assets: [{ data: asset }, { data: { ...asset, state: "ready" } }],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(png, { status: 206 })));
    try {
      expect(await finishMedia(client, id)).toMatchObject({
        id,
        status: "ready",
        fileName: "poster.png",
      });
      expect(calls).toContainEqual(["awareness_media_assets", "eq", ["state", "pending"]]);
      expect(calls.find((c) => c[1] === "update")?.[2][0]).toMatchObject({ state: "ready" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("discards only unattached new media after a database save failure", async () => {
    const { client, raw, calls } = mockClient();
    raw.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    await expect(
      saveResource(client, "posters", {
        ...record,
        description: "Poster",
        format: "PNG",
        image: { id },
      }),
    ).rejects.toThrow("changed");
    expect(calls).toContainEqual(["awareness_media_assets", "in", ["state", ["pending", "ready"]]]);
    expect(calls.find((c) => c[1] === "update")?.[2][0]).toMatchObject({ state: "retired" });
  });
  it("signs published downloads with a short expiry and the stored filename", async () => {
    const { client, storage } = mockClient(
      {
        awareness_media_assets: [
          {
            data: {
              id,
              resource_id: id,
              state: "active",
              path: "random/path.png",
              file_name: "poster.png",
            },
          },
        ],
        awareness_resources: [{ data: { status: "Published" } }],
      },
      "anonymous",
    );
    expect(await mediaUrl(client, id, true)).toBe("https://storage.example/display");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("random/path.png", 60, {
      download: "poster.png",
    });
  });
  it("does not turn a successful mutation into a failure when cleanup throws", async () => {
    const { client, storage } = mockClient({
      awareness_media_assets: [{ data: [{ id, path: "object", created_at: "2020-01-01" }] }],
    });
    storage.remove.mockRejectedValue(new Error("Network failure"));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(deleteResource(client, id, 2)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
