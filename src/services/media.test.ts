import { describe, expect, it } from "vitest";
import { sanitizeDisplayFileName, validateMediaFile, validateVideoFile } from "./media";

describe("media validation", () => {
  it("sanitizes filenames while preserving a lower-case extension", () => {
    expect(sanitizeDisplayFileName(" profile photo (final).PNG")).toBe("profile-photo-final.png");
  });

  it("rejects SVG and GIF uploads", async () => {
    const svg = new File(["<svg/>"], "image.svg", { type: "image/svg+xml" });
    await expect(validateMediaFile(svg)).rejects.toThrow("JPEG, PNG, or WebP");
  });

  it("rejects mismatched MIME types and extensions", async () => {
    const mismatch = new File(["image"], "image.png", { type: "image/jpeg" });
    await expect(validateMediaFile(mismatch)).rejects.toThrow("extension does not match");
  });

  it("rejects files larger than five MiB before decoding", async () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "image.png", {
      type: "image/png",
    });
    await expect(validateMediaFile(oversized)).rejects.toThrow("5 MiB");
  });
});

describe("video validation", () => {
  it("rejects empty videos before decoding", async () => {
    await expect(
      validateVideoFile(new File([], "empty.mp4", { type: "video/mp4" })),
    ).rejects.toThrow("empty");
  });
  it("rejects oversized videos before decoding", async () => {
    const file = new File(["video"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 100 * 1024 * 1024 + 1 });
    await expect(validateVideoFile(file)).rejects.toThrow("100 MiB");
  });
  it("rejects unsupported video formats before reading metadata", async () => {
    const file = new File(["video"], "lesson.mov", { type: "video/quicktime" });
    await expect(validateVideoFile(file)).rejects.toThrow("MP4 or WebM");
  });

  it("rejects a mismatched video extension before reading metadata", async () => {
    const file = new File(["video"], "lesson.webm", { type: "video/mp4" });
    await expect(validateVideoFile(file)).rejects.toThrow("extension does not match");
  });
});
