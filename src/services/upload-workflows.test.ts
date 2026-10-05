import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  prepare: vi.fn(),
  finish: vi.fn(),
  discard: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@/awareness/awareness.functions", () => ({
  prepareAwarenessMedia: api.prepare,
  finishAwarenessMedia: api.finish,
  discardAwarenessMedia: api.discard,
  awarenessMediaUrl: vi.fn(),
}));
vi.mock("@/learning/learning.functions", () => ({
  prepareLearningMedia: api.prepare,
  finishLearningMedia: api.finish,
  discardLearningMedia: api.discard,
  learningMediaUrl: vi.fn(),
}));
vi.mock("./signed-media-upload", () => ({ uploadSignedMedia: api.upload }));
vi.mock("./media", () => ({
  validateMediaFile: vi.fn().mockResolvedValue({ width: 10, height: 10 }),
  validateVideoFile: vi.fn(),
}));
import { AwarenessMediaService } from "./awareness-media";
import { LearningMediaService } from "./learning-media";
beforeEach(() => {
  vi.clearAllMocks();
  api.prepare.mockResolvedValue({
    ok: true,
    data: { id: "first", signedUrl: "https://storage.example/first" },
  });
  api.finish.mockResolvedValue({ ok: true, data: { id: "first", status: "ready" } });
  api.discard.mockResolvedValue({ ok: true });
  api.upload.mockResolvedValue(undefined);
});
for (const [name, service] of [
  ["Awareness", AwarenessMediaService],
  ["Learning", LearningMediaService],
] as const)
  describe(`${name} upload lifecycle`, () => {
    const file = () => new File(["fixture"], "fixture.png", { type: "image/png" });
    it("reports completion only after server verification", async () => {
      const progress = vi.fn();
      const result = await service.save(file(), "Fixture", progress);
      expect(result.id).toBe("first");
      expect(progress).toHaveBeenCalledWith(100);
      expect(api.discard).not.toHaveBeenCalled();
    });
    it("retires uncertain uploads and creates a new path on explicit retry", async () => {
      api.upload.mockRejectedValueOnce(new Error("network failed"));
      await expect(service.save(file(), "Fixture")).rejects.toThrow("try again");
      expect(api.discard).toHaveBeenCalledWith({ data: "first" });
      api.prepare.mockResolvedValueOnce({
        ok: true,
        data: { id: "retry", signedUrl: "https://storage.example/retry" },
      });
      await service.save(file(), "Fixture");
      expect(api.upload).toHaveBeenLastCalledWith(
        expect.any(File),
        "https://storage.example/retry",
        undefined,
      );
    });
    it("retires failed verification and never reports a completed asset", async () => {
      const progress = vi.fn();
      api.finish.mockResolvedValueOnce({ ok: false, code: "validation", message: "Invalid media" });
      await expect(service.save(file(), "Fixture", progress)).rejects.toThrow("Invalid media");
      expect(api.discard).toHaveBeenCalledWith({ data: "first" });
      expect(progress).not.toHaveBeenCalledWith(100);
    });
    it("does not upload after preparation fails", async () => {
      api.prepare.mockResolvedValueOnce({ ok: false, code: "forbidden", message: "Access denied" });
      await expect(service.save(file(), "Fixture")).rejects.toThrow("Access denied");
      expect(api.upload).not.toHaveBeenCalled();
    });
    it("preserves the original error when retired-object cleanup must retry later", async () => {
      api.upload.mockRejectedValueOnce(new Error("network failed"));
      api.discard.mockResolvedValueOnce({ ok: false, code: "server", message: "Retry cleanup" });
      await expect(service.save(file(), "Fixture")).rejects.toThrow("try again");
    });
  });
