import { test, type Page } from "@playwright/test";

export async function requireFixtureDecoder(page: Page, browserName: string, bytes: number[]) {
  if (browserName !== "webkit" || process.platform !== "win32") return;
  // Probe a local Blob before touching application data: this Windows browser
  // build can lack the fixture codec even when canPlayType advertises support.
  const decodes = await page.evaluate(
    (bytes) =>
      new Promise<boolean>((resolve) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "video/webm" }));
        const finish = (result: boolean) => {
          clearTimeout(timeout);
          video.onloadeddata = null;
          video.onerror = null;
          video.removeAttribute("src");
          video.load();
          URL.revokeObjectURL(url);
          resolve(result);
        };
        const timeout = setTimeout(() => finish(false), 10000);
        video.onloadeddata = () => finish(video.readyState >= 2);
        video.onerror = () => finish(false);
        video.src = url;
      }),
    bytes,
  );
  test.skip(
    !decodes,
    "Windows WebKit cannot decode the generated WebM independently of NCAP; verify media playback on native macOS/iOS Safari.",
  );
}
