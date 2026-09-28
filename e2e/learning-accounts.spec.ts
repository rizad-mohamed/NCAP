import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.beforeEach(() => {
  test.skip(
    process.env.LEARNING_E2E !== "1",
    "Requires confirmed staging and disposable accounts.",
  );
});

test("switching learners isolates progress, bookmarks and dashboard statistics", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_SECOND_EMAIL || !process.env.E2E_SECOND_PASSWORD,
    "Requires a second disposable learner.",
  );
  await loginAs(page, "learner");
  await page.goto("/learn/lessons/l-what-is-risk");
  const complete = page.getByRole("button", { name: "Mark as complete", exact: true });
  if (await complete.isVisible()) await complete.click();
  const bookmark = page.getByRole("button", { name: "Bookmark lesson", exact: true });
  if (await bookmark.isVisible()) await bookmark.click();
  await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("1 of 18 lessons", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(process.env.E2E_SECOND_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.E2E_SECOND_PASSWORD!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("0 of 18 lessons", { exact: true })).toBeVisible();
  await page.goto("/learn/lessons/l-what-is-risk");
  await expect(page.getByRole("button", { name: "Mark as complete", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bookmark lesson", exact: true })).toBeVisible();
  await page.goto("/admin/lessons");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: "Add lesson", exact: true })).toHaveCount(0);
});

test("administrator creates, edits, publishes, unpublishes and deletes a lesson", async ({
  page,
}) => {
  await loginAs(page, "admin");
  await page.goto("/admin/lessons");
  await page.getByRole("button", { name: "Add lesson", exact: true }).click();
  const title = `Disposable lesson ${Date.now()}`;
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Title *", exact: true }).fill(title);
  await dialog
    .getByLabel("Summary and content introduction")
    .fill("Learning authoring verification.");
  await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption("Draft");
  await dialog.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
  await dialog.getByRole("textbox", { name: "Title *", exact: true }).fill(`${title} edited`);
  await dialog.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: `Publish ${title} edited`, exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Unpublish ${title} edited`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Unpublish ${title} edited`, exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Publish ${title} edited`, exact: true }),
  ).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: `Delete ${title} edited`, exact: true }).click();
  await expect(page.getByText(`${title} edited`, { exact: true })).toHaveCount(0);
});
