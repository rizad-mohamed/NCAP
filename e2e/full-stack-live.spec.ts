import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("disposable full-stack staging workflows", () => {
  test.skip(process.env.ADMIN_MODULES_E2E !== "1", "Requires the disposable staging runner.");

  test("a module retains a dynamically authored assessment when edited", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/topics");
    await page.getByRole("tab", { name: "modules", exact: true }).click();
    await page
      .getByRole("button", { name: `Edit ${process.env.E2E_MODULE_TITLE}`, exact: true })
      .click();
    const editor = page.getByRole("dialog", { name: "Edit learning module" });
    await expect(editor.getByLabel("Related quiz")).toHaveValue(process.env.E2E_QUIZ_ID!);
    await expect(editor.getByLabel("Related quiz").locator("option:checked")).toHaveText(
      process.env.E2E_QUIZ_TITLE!,
    );
    await editor.getByRole("button", { name: "Save module", exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.reload();
    await page.getByRole("tab", { name: "modules", exact: true }).click();
    await page
      .getByRole("button", { name: `Edit ${process.env.E2E_MODULE_TITLE}`, exact: true })
      .click();
    await expect(page.getByLabel("Related quiz")).toHaveValue(process.env.E2E_QUIZ_ID!);
  });

  test("learning bookmarks and completion persist and remain isolated between learners", async ({
    page,
    browser,
  }) => {
    const lesson = `/learn/lessons/${process.env.E2E_LESSON_ID}`;
    await loginAs(page, "learner");
    await page.goto(lesson);
    await expect(page.getByRole("button", { name: "Completed", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Bookmark lesson", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeVisible();
    const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const other = await context.newPage();
      await loginAs(other, "learner");
      await other.goto(lesson);
      await expect(
        other.getByRole("button", { name: "Remove bookmark", exact: true }),
      ).toBeVisible();
      await expect(other.getByRole("button", { name: "Completed", exact: true })).toBeDisabled();
      await other.goto("/dashboard");
      await expect(other.getByRole("heading", { level: 1 })).toBeVisible();
      await other.getByRole("button", { name: "Log out", exact: true }).click();
      await other.goto("/login");
      await other.getByLabel("Email address").fill(process.env.E2E_SECOND_EMAIL!);
      await other.locator('input[name="password"]').fill(process.env.E2E_SECOND_PASSWORD!);
      await other.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(other).toHaveURL(/\/dashboard$/);
      await other.goto(lesson);
      await expect(
        other.getByRole("button", { name: "Bookmark lesson", exact: true }),
      ).toBeVisible();
      await expect(
        other.getByRole("button", { name: "Mark as complete", exact: true }),
      ).toBeEnabled();
      await other.goto("/admin/users");
      await expect(other).toHaveURL(/\/dashboard$/);
    } finally {
      await context.close();
      await page.goto(lesson);
      await page.getByRole("button", { name: "Remove bookmark", exact: true }).click();
    }
  });

  test("quiz timing, reload, scoring, history and retake use the staging backend", async ({
    page,
  }) => {
    const quiz = `/quizzes/${process.env.E2E_QUIZ_ID}`;
    await loginAs(page, "learner");
    await page.goto(quiz);
    await page.getByRole("link", { name: "Start quiz" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.getByRole("radio", { name: /Use a unique passphrase/ }).check();
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Correct", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "View results", exact: true }).click();
    await expect(page.getByText("Quiz complete", { exact: true })).toBeVisible();
    await expect(page.locator(".font-mono.text-5xl").first()).toContainText("100");
    await page.reload();
    await expect(page.getByText("Quiz complete", { exact: true })).toBeVisible();
    await page.goto(quiz);
    await expect(page.getByText(/Attempt 2: 100%/)).toBeVisible();
    await page.getByRole("link", { name: "Start quiz" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
  });

  test("administrator filters, details, role and account status changes persist", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/users");
    await page.getByRole("searchbox").fill(process.env.E2E_SECOND_EMAIL!);
    await page.getByRole("combobox", { name: "Sort", exact: true }).selectOption("email");
    const row = page.getByRole("row").filter({ hasText: process.env.E2E_SECOND_EMAIL! });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: "View", exact: true }).click();
    const details = page.getByRole("region", { name: "User details" });
    await expect(details).toContainText(process.env.E2E_SECOND_EMAIL!);
    await details.getByRole("combobox", { name: "Role", exact: true }).selectOption("super_admin");
    await details.getByRole("button", { name: "Update role", exact: true }).click();
    await expect(row.getByRole("cell", { name: "Super Admin", exact: true })).toBeVisible();
    await details.getByRole("combobox", { name: "Role", exact: true }).selectOption("learner");
    await details.getByRole("button", { name: "Update role", exact: true }).click();
    await expect(row.getByRole("cell", { name: "Learner", exact: true })).toBeVisible();
    await expect(details.getByLabel("Reason", { exact: true })).toHaveValue("");
    for (const status of ["suspended", "active", "disabled", "active"]) {
      await details.getByRole("combobox", { name: "Status", exact: true }).selectOption(status);
      await details.getByLabel("Reason", { exact: true }).fill("Disposable staging verification");
      await details.getByRole("button", { name: "Update status", exact: true }).click();
      await expect(
        row.getByText(status[0]!.toUpperCase() + status.slice(1), { exact: true }),
      ).toBeVisible();
    }
  });
});
