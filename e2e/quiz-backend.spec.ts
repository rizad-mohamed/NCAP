import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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
  test("administrator can author, publish, and remove a question", async ({ page }) => {
    test.setTimeout(120_000);
    const prompt = `Quiz authoring verification ${randomUUID().slice(0, 8)}?`;
    const edited = `${prompt} Updated`;
    async function cleanup() {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error("Quiz test cleanup requires Supabase configuration");
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const signedIn = await client.auth.signInWithPassword({
        email: process.env.E2E_ADMIN_EMAIL!, password: process.env.E2E_ADMIN_PASSWORD!,
      });
      if (signedIn.error) throw new Error("Quiz test cleanup sign-in failed");
      const questions = await client.rpc("quiz_admin_questions", { target: "q-fundamentals" });
      if (questions.error) throw new Error("Quiz test cleanup lookup failed");
      for (const question of (questions.data as { id: string; prompt: string; version: number }[]).filter(
        (item) => item.prompt === prompt || item.prompt === edited,
      )) {
        const removed = await client.rpc("quiz_delete_question", { target: question.id, expected_version: question.version });
        if (removed.error) throw new Error("Quiz test cleanup deletion failed");
      }
    }
    await loginAs(page, "admin");
    page.on("dialog", (dialog) => void dialog.accept());
    try {
      await page.goto("/admin/questions");
      await page.getByRole("button", { name: /Digital Safety Fundamentals/ }).click();
      await page.getByRole("button", { name: "Add question" }).click();
      const editor = page.getByRole("dialog", { name: "Question editor" });
      await editor.locator("textarea").first().fill(prompt);
      await editor.locator("textarea").nth(1).fill("A unique password protects the account.");
      const answers = editor.locator('fieldset input:not([type="radio"])');
      for (const [index, answer] of ["Reuse a password", "Use a unique password", "Share a password", "Post a password"].entries()) {
        await answers.nth(index).fill(answer);
      }
      await editor.getByRole("radio").nth(1).check();
      await editor.getByRole("button", { name: "Save question" }).click();
      let article = page.locator("article").filter({ hasText: prompt });
      await expect(article).toBeVisible();
      await article.getByRole("button", { name: "Edit" }).click();
      await expect(editor).toBeVisible();
      await editor.locator("textarea").first().fill(edited);
      await editor.getByRole("button", { name: "Save question" }).click();
      article = page.locator("article").filter({ hasText: edited });
      await expect(article).toBeVisible();
      await article.getByRole("button", { name: "Publish" }).click();
      await expect(article).toContainText("Published");
      await article.getByRole("button", { name: "Delete question" }).click();
      await expect(article).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });
});
