import { describe, expect, it } from "vitest";
import { inspectImage, inspectVideo } from "./inspect-media";
function png() {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  view.setUint32(16, 800);
  view.setUint32(20, 600);
  return bytes;
}
describe("Server container inspection", () => {
  it("requires the complete PNG signature and complete IHDR shape", () => {
    expect(inspectImage(png(), "image/png")).toEqual({ width: 800, height: 600 });
    for (const position of [0, 1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15]) {
      const bad = png();
      bad[position] = 0;
      expect(() => inspectImage(bad, "image/png")).toThrow();
    }
    expect(() => inspectImage(png().slice(0, 24), "image/png")).toThrow();
  });
  it("rejects JPEG segments shorter than their declared frame size", () => {
    const bytes = new Uint8Array(20);
    bytes.set([255, 216, 255, 192, 0, 32, 8, 0, 10, 0, 10]);
    expect(() => inspectImage(bytes, "image/jpeg")).toThrow();
    bytes[5] = 4;
    expect(() => inspectImage(bytes, "image/jpeg")).toThrow();
  });
  it("rejects unsupported video MIME and disguised executable content", () => {
    const bytes = new TextEncoder().encode("<script>alert(1)</script>");
    expect(() => inspectImage(bytes, "image/png")).toThrow();
    expect(() => inspectVideo(bytes, bytes, "application/octet-stream")).toThrow();
  });
});
