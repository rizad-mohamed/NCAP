import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// Run only against a migrated disposable Supabase project with learning-seed.sql applied.
test.describe("persistent Learning backend", () => {
  test.skip(
    process.env.LEARNING_E2E !== "1",
    "Set LEARNING_E2E=1 against a migrated disposable project.",
  );
  test("completion and bookmarks survive a separate browser session", async ({ page, browser }) => {
    await loginAs(page, "learner");
    await page.goto("/learn/lessons/l-what-is-risk");
    await expect(
      page.getByRole("heading", { name: "What online risk really looks like" }),
    ).toBeVisible();
    const complete = page.getByRole("button", { name: "Mark as complete" });
    if (await complete.isVisible()) await complete.click();
    const bookmark = page.getByRole("button", { name: "Bookmark lesson", exact: true });
    if (await bookmark.isVisible()) await bookmark.click();
    await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeVisible();
    const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const device = await context.newPage();
      await loginAs(device, "learner");
      await device.goto("/learn/lessons/l-what-is-risk");
      await expect(
        device.getByRole("button", { name: "Remove bookmark", exact: true }),
      ).toBeVisible();
      await expect(device.getByRole("button", { name: "Mark as complete" })).toHaveCount(0);
      await device.goto("/bookmarks");
      await expect(
        device.getByRole("heading", { name: "What online risk really looks like" }),
      ).toBeVisible();
      await device.goto("/learn/search?q=risk");
      await expect(
        device.getByRole("link", { name: /What online risk really looks like/ }).first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
