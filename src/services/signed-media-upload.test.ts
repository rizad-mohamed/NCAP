import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadSignedMedia } from "./signed-media-upload";
class Request {
  static current: Request;
  status = 200;
  timeout = 0;
  upload = {
    onprogress: null as
      ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  constructor() {
    Request.current = this;
  }
}
afterEach(() => vi.unstubAllGlobals());
describe("Private signed upload transport", () => {
  it("reports bounded transfer progress and uses immutable PUT headers", async () => {
    vi.stubGlobal("XMLHttpRequest", Request);
    const progress = vi.fn();
    const file = new File(["fixture"], "test.png", { type: "image/png" });
    const uploading = uploadSignedMedia(file, "https://storage.example/signed", progress);
    const request = Request.current;
    request.upload.onprogress?.({ lengthComputable: true, loaded: 7, total: 7 });
    expect(progress).toHaveBeenCalledWith(99);
    expect(request.timeout).toBe(300000);
    expect(request.setRequestHeader).toHaveBeenCalledWith("x-upsert", "false");
    request.onload?.();
    await expect(uploading).resolves.toBeUndefined();
  });
  for (const failure of ["http", "error", "timeout", "abort"] as const)
    it(`rejects ${failure} without replaying the PUT`, async () => {
      vi.stubGlobal("XMLHttpRequest", Request);
      const uploading = uploadSignedMedia(
        new File(["fixture"], "test.png"),
        "https://storage.example/signed",
      );
      const assertion = expect(uploading).rejects.toThrow("try again");
      const request = Request.current;
      if (failure === "http") {
        request.status = 500;
        request.onload?.();
      } else if (failure === "error") request.onerror?.();
      else if (failure === "timeout") request.ontimeout?.();
      else request.onabort?.();
      await assertion;
      expect(request.send).toHaveBeenCalledTimes(1);
    });
});
