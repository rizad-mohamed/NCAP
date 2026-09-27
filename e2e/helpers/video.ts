import type { Page } from "@playwright/test";

export async function recordVideoFixture(page: Page, mimeType: string): Promise<number[]> {
  return page.evaluate(async (mimeType) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType === "video/mp4" ? "video/mp4;codecs=avc1.42E01E" : "video/webm;codecs=vp8",
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    const startedAt = performance.now();
    recorder.start();
    const paint = window.setInterval(() => {
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, 320, 180);
      context.fillStyle = "#ffffff";
      context.fillText(`NCAP video ${Date.now()}`, 30, 90);
    }, 65);
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
    recorder.stop();
    await stopped;
    const durationMs = performance.now() - startedAt;
    window.clearInterval(paint);
    stream.getTracks().forEach((track) => track.stop());
    const recorded = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer());
    if (mimeType !== "video/webm") return Array.from(recorded);
    // MediaRecorder emits streaming WebM without a finite duration. Finalize
    // its Info element so the fixture satisfies server-side container validation.
    const vint = (offset: number, keepMarker = false) => {
      const first = recorded[offset]!;
      let length = 1;
      while (length <= 8 && !(first & (128 >> (length - 1)))) length++;
      if (length > 8 || offset + length > recorded.length) throw new Error("Invalid WebM");
      let value = keepMarker ? first : first & ((128 >> (length - 1)) - 1);
      for (let i = 1; i < length; i++) value = value * 256 + recorded[offset + i]!;
      return { value, length };
    };
    let offset = 0;
    while (offset < recorded.length) {
      const id = vint(offset, true);
      const size = vint(offset + id.length);
      const start = offset + id.length + size.length;
      if (id.value === 0x18538067) {
        let child = start;
        while (child < recorded.length) {
          const childId = vint(child, true);
          const childSize = vint(child + childId.length);
          const body = child + childId.length + childSize.length;
          const end = body + childSize.value;
          if (childId.value === 0x1549a966) {
            let scale = 1_000_000;
            const fields: number[] = [];
            for (let field = body; field < end;) {
              const fieldId = vint(field, true);
              const fieldSize = vint(field + fieldId.length);
              const valueStart = field + fieldId.length + fieldSize.length;
              const valueEnd = valueStart + fieldSize.value;
              if (fieldId.value === 0x2ad7b1) {
                scale = 0;
                for (let i = valueStart; i < valueEnd; i++) scale = scale * 256 + recorded[i]!;
              }
              if (fieldId.value !== 0x4489) fields.push(...recorded.slice(field, valueEnd));
              field = valueEnd;
            }
            const duration = new Uint8Array(8);
            new DataView(duration.buffer).setFloat64(0, (durationMs * 1_000_000) / scale);
            fields.push(0x44, 0x89, 0x88, ...duration);
            const length = fields.length;
            return [
              ...recorded.slice(0, offset + id.length),
              0x01,
              0xff,
              0xff,
              0xff,
              0xff,
              0xff,
              0xff,
              0xff, // unknown segment size
              ...recorded.slice(start, child),
              0x15,
              0x49,
              0xa9,
              0x66,
              0x10 | (length >>> 24),
              (length >>> 16) & 255,
              (length >>> 8) & 255,
              length & 255,
              ...fields,
              ...recorded.slice(end),
            ];
          }
          child = end;
        }
        throw new Error("WebM fixture has no Info element");
      }
      offset = start + size.value;
    }
    throw new Error("WebM fixture has no segment");
  }, mimeType);
}
