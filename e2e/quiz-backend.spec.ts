import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("persistent Quiz backend", () => {
  test.skip(
    process.env.QUIZ_E2E !== "1",
    "Requires a migrated, seeded disposable Supabase project.",
  );
  test("catalogue, timed attempt, feedback and cross-session result recovery", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "learner");
    await page.goto("/quizzes");
    await expect(page.getByRole("heading", { name: "Digital Safety Fundamentals" })).toBeVisible();
    await page.locator('a[href="/quizzes/q-fundamentals"]').click();
    await page.getByRole("link", { name: /Start quiz|Resume quiz/ }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Submit answer" }).click();
    await expect(page.getByRole("heading", { name: /^(Correct|Incorrect)$/ })).toBeVisible();
    const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const device = await context.newPage();
      await loginAs(device, "learner");
      await device.goto("/quizzes/q-fundamentals/run");
      await expect(device.getByRole("timer")).toBeVisible();
      await expect(device.getByText(/Question 2 of/)).toBeVisible();
      for (let question = 2; question <= 8; question += 1) {
        await expect(device.getByText(`Question ${question} of 8`, { exact: false })).toBeVisible();
        await device.getByRole("radio").first().check();
        await device.getByRole("button", { name: "Submit answer" }).click();
        await expect(device.getByRole("heading", { name: /^(Correct|Incorrect)$/ })).toBeVisible();
        await device.getByRole("button", { name: question === 8 ? "View results" : "Next question" }).click();
      }
      await expect(device).toHaveURL(/\/quizzes\/q-fundamentals\/results$/);
      await expect(device.getByText("Quiz complete")).toBeVisible();
      const score = await device.locator(".font-mono.text-5xl").first().textContent();
      await device.reload();
      await expect(device.getByText("Quiz complete")).toBeVisible();
      await expect(device.locator(".font-mono.text-5xl").first()).toHaveText(score ?? "");
    } finally {
      await context.close();
    }
  });
  test("administrator sees persistent quiz management", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/questions");
    await expect(page.getByRole("heading", { name: "Quiz management" })).toBeVisible();
    await expect(page.getByText("Digital Safety Fundamentals").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Add question" })).toBeVisible();
  });
});
