import { chromium, expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openWorkspaceLink(page: Page, role: "admin" | "learner", name: string) {
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await page.getByRole("button", { name: "Open workspace navigation" }).click();
  }
  await page
    .getByRole("navigation", { name: `${role} navigation` })
    .getByRole("link", { name, exact: true })
    .click();
}

async function openRiskLesson(page: Page) {
  await openWorkspaceLink(page, "learner", "Learn");
  await page.locator('a[href="/learn/modules/m-fundamentals"]').first().click();
  await page.locator('a[href="/learn/lessons/l-what-is-risk"]').first().click();
}

test("administrator can add an optional video and author lesson blocks without JSON", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const lessonTitle = "What online risk really looks like";
  // Verify that the production CSP permits the provider frame without relying
  // on a third-party service being reachable from the test environment.
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html lang='en'><title>Video provider test</title><body>Provider frame loaded</body></html>",
    }),
  );
  const response = await page.request.get("/login");
  const policy = response.headers()["content-security-policy"] ?? "";
  expect(policy).toContain("frame-src https://www.youtube-nocookie.com https://player.vimeo.com");
  expect(policy).toContain("media-src 'self' blob: https:");
  expect(policy).toContain("object-src 'none'");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Administrator" }).click();
  await page.waitForURL("**/admin");
  await openWorkspaceLink(page, "admin", "Lessons");

  await page.getByRole("button", { name: `Edit ${lessonTitle}` }).click();
  const dialog = page.getByRole("dialog", { name: "Edit lesson" });
  await expect(dialog.getByText("Structured lesson blocks (JSON)")).toHaveCount(0);
  await expect(dialog.getByRole("toolbar", { name: "Add lesson content" })).toBeVisible();

  await dialog.getByLabel("Video source").selectOption("external");
  await dialog.getByLabel("HTTPS video URL").fill("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  await dialog
    .getByLabel("Video transcript")
    .fill("This demonstration transcript explains the lesson video in accessible text.");
  await dialog.getByRole("button", { name: "Heading", exact: true }).click();
  await dialog.getByLabel("Heading text").last().fill("Video recap");
  await dialog.getByRole("button", { name: "Bold paragraph", exact: true }).first().click();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(() => dialog.evaluate((node) => node.scrollWidth - node.clientWidth))
    .toBeLessThanOrEqual(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const accessibility = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
  ).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(dialog).not.toBeVisible();

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Learner" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Demo" })).toBeVisible();
  await openRiskLesson(page);

  const player = page.getByTitle(`${lessonTitle} video`);
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ");
  await expect(
    page
      .frameLocator("iframe[title='What online risk really looks like video']")
      .getByText("Provider frame loaded"),
  ).toBeVisible();
  await page.getByText("Read video transcript").click();
  await expect(page.getByText("This demonstration transcript explains")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Video recap" })).toBeVisible();
  await expect(page.locator("article p.whitespace-pre-wrap").first()).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.getByRole("complementary", { name: "Course content" })).toBeVisible();
});

test("uploaded lesson videos play, retain speed controls, and survive edit cancellation", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Administrator" }).click();
  await page.waitForURL("**/admin");
  // Produce a real, silent WebM fixture locally; this test has no media-network dependency.
  // Windows WebKit lacks canvas recording. Generate its fixture in Chromium,
  // but validate, upload, and play that file in the target browser.
  const generator = browserName === "webkit" ? await chromium.launch() : undefined;
  const mimeType = browserName === "webkit" ? "video/mp4" : "video/webm";
  let bytes: number[];
  try {
    const recordingPage = generator ? await generator.newPage() : page;
    bytes = await recordingPage.evaluate(async (mimeType) => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const context = canvas.getContext("2d")!;
      const stream = canvas.captureStream(15);
      const recorder = new MediaRecorder(stream, {
        mimeType:
          mimeType === "video/mp4" ? "video/mp4;codecs=avc1.42E01E" : "video/webm;codecs=vp8",
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
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
      window.clearInterval(paint);
      stream.getTracks().forEach((track) => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer()));
    }, mimeType);
  } finally {
    await generator?.close();
  }
  if (browserName === "webkit" && process.platform === "win32") {
    // Capability gate independent of application validation: this Windows
    // WebKit build advertises codecs but can reject even basic recorded files.
    const decodesFixture = await page.evaluate(
      ({ bytes, mimeType }) =>
        new Promise<boolean>((resolve) => {
          const video = document.createElement("video");
          const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mimeType }));
          const finish = (supported: boolean) => {
            window.clearTimeout(timeout);
            video.onloadedmetadata = null;
            video.onerror = null;
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
            resolve(supported);
          };
          const timeout = window.setTimeout(() => finish(false), 10_000);
          video.onloadedmetadata = () => finish(video.videoWidth > 0);
          video.onerror = () => finish(false);
          video.preload = "metadata";
          video.src = url;
        }),
      { bytes, mimeType },
    );
    test.skip(
      !decodesFixture,
      "Windows WebKit cannot decode the generated MP4 fixture independently of the app; native Safari playback still needs verification on macOS/iOS.",
    );
  }
  const title = "What online risk really looks like";
  await openWorkspaceLink(page, "admin", "Lessons");
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  const dialog = page.getByRole("dialog", { name: "Edit lesson" });
  await dialog.getByLabel("Video source").selectOption("upload");
  await dialog.getByLabel("Choose video", { exact: true }).setInputFiles({
    name: mimeType === "video/mp4" ? "lesson.mp4" : "lesson.webm",
    mimeType,
    buffer: Buffer.from(bytes),
  });
  await dialog.getByRole("button", { name: "Use this video" }).click();
  const uploadError = page.locator('[data-sonner-toast][data-type="error"]').first();
  const uploadOutcome = await Promise.race([
    dialog
      .getByLabel("Uploaded lesson video preview")
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => "ready"),
    uploadError.waitFor({ state: "visible", timeout: 20_000 }).then(() => uploadError.innerText()),
  ]);
  expect(uploadOutcome).toBe("ready");
  await expect(dialog.getByLabel("Uploaded lesson video preview")).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Video transcript")
    .fill("An accessible transcript for the locally uploaded lesson.");
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await dialog.getByRole("button", { name: "Remove video" }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Learner" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Demo" })).toBeVisible();
  await openRiskLesson(page);
  const player = page.getByLabel(`${title} video`, { exact: true });
  await expect(player).toBeVisible();
  await expect
    .poll(() => player.evaluate((node) => (node as HTMLVideoElement).readyState))
    .toBeGreaterThanOrEqual(2);
  await page.getByRole("combobox", { name: "Playback speed" }).selectOption("1.5");
  await expect(player).toHaveJSProperty("playbackRate", 1.5);
  await player.evaluate(async (node) => {
    const video = node as HTMLVideoElement;
    video.muted = true;
    await video.play();
  });
  await expect
    .poll(() => player.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.5);
  await player.evaluate((node) => (node as HTMLVideoElement).pause());
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Resumed at")).toBeVisible();
  await expect(player).toHaveAttribute("src", /^blob:/);
});
