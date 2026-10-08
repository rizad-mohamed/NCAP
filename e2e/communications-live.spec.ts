import { expect as baseExpect, test, type Page } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20000 });
import { loginAs } from "./helpers/auth";
import { confirmDialog } from "./helpers/confirmation";
import { gotoApp, reloadApp } from "./helpers/navigation";
const enabled = process.env.COMMUNICATIONS_E2E === "1";
const prefix = process.env.E2E_COMM_PREFIX ?? "";
const date = process.env.E2E_COMM_DATE ?? "";
// Native Windows trace finalization failed while closing secondary contexts.
// Keep disposable fixture credentials out of traces.
test.use({ trace: "off" });
async function language(page: Page, code: "en" | "si" | "ta") {
  await page.getByRole("button", { name: /^(Language|භාෂාව|மொழி):/ }).click();
  await page
    .getByRole("menuitem")
    .filter({ hasText: code === "en" ? "English" : code === "si" ? "සිංහල" : "தமிழ்" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", code);
}
test.describe("Persistent communications staging workflows", () => {
  test.skip(!enabled, "Requires confirmed staging and disposable accounts.");
  test.setTimeout(180000);
  test("administrator announcement CRUD, preview and targeting", async ({ page }) => {
    await loginAs(page, "admin");
    await gotoApp(page, "/admin/announcements");
    await expect(page.getByRole("heading", { name: `${prefix} API`, exact: true })).toBeVisible();
    const title = `${prefix} browser`;
    await page.getByRole("button", { name: "New announcement" }).click();
    const editor = page.getByRole("dialog", { name: "Announcement editor" });
    await editor.getByLabel("Title", { exact: true }).fill(title);
    await editor
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Disposable audience notice");
    await editor
      .getByRole("combobox", { name: "Audience", exact: true })
      .selectOption("New Learners");
    await editor.getByLabel("Start date").fill(date);
    await editor.getByLabel("End date").fill(date);
    await editor.getByLabel("Active", { exact: true }).check();
    await editor.getByText("Preview announcement", { exact: true }).click();
    await expect(editor.getByRole("heading", { name: title })).toBeVisible();
    await editor.getByRole("button", { name: "Save announcement" }).click();
    await expect(editor).toHaveCount(0);
    await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
    await editor
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Updated disposable notice");
    await editor.getByRole("button", { name: "Save announcement" }).click();
    await expect(editor).toHaveCount(0);
    await page.getByRole("button", { name: `Deactivate ${title}`, exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Activate ${title}`, exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
    await confirmDialog(page, "Delete this announcement?");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });
  test("learner notifications, unread counts and persistent read state across devices", async ({
    page,
    browser,
  }) => {
    const title = `${prefix} API`;
    await loginAs(page, "learner");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await page.getByRole("button", { name: /^Notifications:/ }).click();
    const list = page.getByRole("dialog");
    const item = list.locator("li").filter({ hasText: title });
    await expect(item).toHaveCount(1);
    await item.getByRole("button", { name: "Mark as read", exact: true }).click();
    await expect(item.getByRole("button", { name: "Mark as unread", exact: true })).toBeEnabled();
    await item.getByRole("button", { name: "Mark as unread", exact: true }).click();
    await expect(item.getByRole("button", { name: "Mark as read", exact: true })).toBeEnabled();
    await list.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByRole("button", { name: "Notifications: 0", exact: true })).toBeVisible();
    await reloadApp(page);
    await expect(page.getByRole("button", { name: "Notifications: 0", exact: true })).toBeVisible();
    const otherContext = await browser.newContext();
    try {
      const other = await otherContext.newPage();
      await loginAs(other, "learner");
      await expect(
        other.getByRole("button", { name: "Notifications: 0", exact: true }),
      ).toBeVisible();
    } finally {
      await otherContext.close();
    }
  });
  test("admin translation authoring, profile language across devices, account switching and content fallback", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "admin");
    await gotoApp(page, "/admin/lessons");
    await page.getByRole("button", { name: `Translate ${prefix}`, exact: true }).click();
    const editor = page.getByRole("dialog");
    await expect(editor.getByText(/Untranslated/)).toBeVisible();
    const translated = `${prefix} Sinhala QA`;
    await editor.getByRole("textbox", { name: /^title$/i }).fill(translated);
    await editor.getByRole("combobox", { name: "Status", exact: true }).selectOption("Published");
    await editor
      .getByRole("checkbox", {
        name: "I have reviewed this translation against the current source.",
      })
      .check();
    await editor.getByRole("button", { name: "Save translation" }).click();
    await expect(editor).toHaveCount(0);
    const context = await browser.newContext();
    try {
      const learner = await context.newPage();
      await loginAs(learner, "learner");
      await language(learner, "si");
      await reloadApp(learner);
      await expect(learner.locator("html")).toHaveAttribute("lang", "si");
      await expect(learner.getByRole("button", { name: /^දැනුම්දීම්:/ })).toBeVisible();
      await gotoApp(learner, `/learn/lessons/${process.env.E2E_COMM_LESSON_ID}`);
      await expect(learner.getByRole("heading", { name: translated, exact: true })).toBeVisible();
      const elsewhere = await browser.newContext();
      try {
        const device = await elsewhere.newPage();
        await loginAs(device, "learner");
        await expect(device.locator("html")).toHaveAttribute("lang", "si");
        await language(device, "ta");
        await gotoApp(device, `/learn/lessons/${process.env.E2E_COMM_LESSON_ID}`);
        await expect(
          device.getByRole("heading", { name: prefix, exact: true, level: 1 }),
        ).toBeVisible();
        await language(device, "en");
      } finally {
        await elsewhere.close();
      }
      // A different authoritative account must restore its own English preference.
      await loginAs(learner, "admin");
      await expect(learner.locator("html")).toHaveAttribute("lang", "en");
    } finally {
      await context.close();
    }
  });
});
