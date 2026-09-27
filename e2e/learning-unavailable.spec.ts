import { expect, test } from "@playwright/test";
import { recordVideoFixture } from "./helpers/video";
import { inspectVideo } from "../src/server/awareness/inspect-media";

// This suite intentionally has no live backend or credentials and performs no mutations.
test.describe("Learning backend unavailable", () => {
  test.skip(
    process.env.LEARNING_UNAVAILABLE_E2E !== "1",
    "Run with Supabase forced to an unavailable localhost endpoint.",
  );
  for (const route of ["/learn", "/learn/modules/m-fundamentals"]) {
    test(`${route} shows an actionable error without demo content`, async ({ page }) => {
      await page.goto(route);
      await expect(
        page.getByRole("alert").filter({ hasText: "Learning is temporarily unavailable" }),
      ).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "What online risk really looks like" }),
      ).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Digital Safety Fundamentals" })).toHaveCount(
        0,
      );
    });
  }
  test("lesson pages retain the sign-in boundary when the backend is unavailable", async ({
    page,
  }) => {
    await page.goto("/learn/lessons/l-what-is-risk");
    await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to login" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What online risk really looks like" }),
    ).toHaveCount(0);
  });
  test("generated upload fixture has verifiable dimensions and duration", async ({ page }) => {
    const bytes = new Uint8Array(await recordVideoFixture(page, "video/webm"));
    const metadata = inspectVideo(bytes, bytes, "video/webm");
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(180);
    expect(metadata.durationSeconds).toBeGreaterThanOrEqual(2.5);
    const decodedDuration = await page.evaluate(async (fileBytes) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(fileBytes)], { type: "video/webm" }),
      );
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Fixture did not decode"));
          video.src = url;
        });
        return video.duration;
      } finally {
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
      }
    }, Array.from(bytes));
    expect(Math.abs(decodedDuration - metadata.durationSeconds)).toBeLessThan(1);
  });
});
