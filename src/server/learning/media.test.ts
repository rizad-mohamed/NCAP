import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareMedia, finishMedia, mediaUrl, cleanupMedia } from "./media";
import type { LearningClient } from "./authorization";
type Reply = { data?: unknown; error?: unknown };
function mock(replies: Reply[] = [], role = "super_admin") {
  const calls: string[] = [];
  const storage = {
    createSignedUploadUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://storage.test/upload" }, error: null }),
    createSignedUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://storage.test/read" }, error: null }),
    info: vi.fn().mockResolvedValue({ data: { size: 100, contentType: "image/png" }, error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  };
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const raw = {
    auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) },
    from(table: string) {
      const chain: unknown = new Proxy(
        {},
        {
          get(_, method: string) {
            if (method === "then")
              return (resolve: (value: Reply) => void) =>
                Promise.resolve(
                  table === "profiles"
                    ? { data: { role }, error: null }
                    : (replies.shift() ?? { data: [], error: null }),
                ).then(resolve);
            return () => {
              calls.push(`${table}.${method}`);
              return chain;
            };
          },
        },
      );
      return chain;
    },
    rpc,
    storage: { from: vi.fn().mockReturnValue(storage) },
  };
  return { client: raw as unknown as LearningClient, storage, rpc, calls };
}
const asset = {
  id: "00000000-0000-4000-8000-000000000001",
  path: "admin/image.png",
  file_name: "image.png",
  mime_type: "image/png",
  size_bytes: 100,
  width: 10,
  height: 10,
  alt_text: "Example",
  role: "image",
  state: "pending",
  created_at: "2020-01-01",
};
afterEach(() => vi.unstubAllGlobals());
describe("Learning managed media", () => {
  it("rejects learners and invalid metadata before issuing upload tokens", async () => {
    const learner = mock([], "learner");
    await expect(prepareMedia(learner.client, {})).rejects.toMatchObject({ code: "forbidden" });
    const admin = mock();
    await expect(
      prepareMedia(admin.client, {
        fileName: "x.svg",
        mimeType: "image/svg+xml",
        sizeBytes: 10,
        width: 10,
        height: 10,
        altText: "Example",
      }),
    ).rejects.toBeDefined();
    expect(admin.storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });
  it("creates a managed upload without allowing overwrite", async () => {
    const m = mock([{ error: null }]);
    const result = await prepareMedia(m.client, {
      fileName: "image.png",
      mimeType: "image/png",
      sizeBytes: 100,
      width: 10,
      height: 10,
      altText: "Example",
    });
    expect(result.signedUrl).toBe("https://storage.test/upload");
    expect(m.storage.createSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^admin\/.+\.png$/),
      { upsert: false },
    );
  });
  it("retires uploaded files whose actual size differs from declared metadata", async () => {
    const m = mock([{ data: asset, error: null }]);
    m.storage.info.mockResolvedValue({
      data: { size: 101, contentType: "image/png" },
      error: null,
    });
    await expect(finishMedia(m.client, asset.id)).rejects.toMatchObject({ code: "validation" });
    expect(m.rpc).toHaveBeenCalledWith("retire_learning_media", { target: asset.id });
  });
  it("rejects spoofed file bytes during server inspection", async () => {
    const m = mock([{ data: asset, error: null }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Uint8Array(100), { status: 206 })),
    );
    await expect(finishMedia(m.client, asset.id)).rejects.toBeDefined();
    expect(m.rpc).toHaveBeenCalledWith("retire_learning_media", { target: asset.id });
  });
  it("does not sign hidden assets or lose retry metadata on deletion failure", async () => {
    const m = mock([
      { data: null, error: null },
      { data: [asset], error: null },
    ]);
    await expect(mediaUrl(m.client, asset.id)).rejects.toMatchObject({ code: "not-found" });
    expect(m.storage.createSignedUrl).not.toHaveBeenCalled();
    m.storage.remove.mockResolvedValue({ error: { message: "retry" } });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await cleanupMedia(m.client);
    expect(m.calls).not.toContain("learning_media_assets.delete");
    warning.mockRestore();
  });
});
