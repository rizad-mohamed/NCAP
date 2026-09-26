import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe.configure({ timeout: 60000 });
test.beforeEach(async ({ browserName }, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name.startsWith("mobile") || process.env.AWARENESS_E2E !== "1",
    "Set AWARENESS_E2E=1 on a migrated test project to run persistence checks.",
  );
});

test("article content and topic edits persist across independent browsers", async ({
  page,
  browser,
}) => {
  await loginAs(page, "admin");
  const title = `Safer community messaging ${Date.now()}`;
  await page.goto("/admin/awareness/articles");
  await page.getByRole("button", { name: "Add Article", exact: true }).click();
  await page.getByLabel("Title *").fill(title);
  await page
    .getByLabel("Summary *", { exact: true })
    .fill("Verify unusual requests before sharing a code.");
  await page.getByLabel("Topic", { exact: true }).selectOption("Phishing");
  await page.getByLabel("Status", { exact: true }).selectOption("Published");
  await page.getByLabel("Author / source").fill("NCAP Content Review Team");
  await page.getByLabel("Reading minutes").fill("4");
  await page
    .getByLabel("Article body *")
    .fill(
      "Pause when a message creates urgency.\n\nConfirm through a contact method you already trust.",
    );
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
  await page.getByLabel("Topic", { exact: true }).selectOption("MFA");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const guest = await browser.newContext();
  try {
    const publicPage = await guest.newPage();
    await publicPage.goto("/awareness/articles");
    await publicPage.getByLabel("Filter by topic").selectOption("MFA");
    await publicPage.getByRole("searchbox").fill(title);
    await publicPage.getByRole("link", { name: title, exact: true }).click();
    await expect(publicPage.getByText("By NCAP Content Review Team")).toBeVisible();
    await expect(publicPage.getByText("4 minute read", { exact: true })).toBeVisible();
    await expect(
      publicPage.getByText("Confirm through a contact method you already trust."),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("ncap.demo.v2") ?? "{}").state?.articles,
      ),
    ).toBeUndefined();
  } finally {
    await guest.close();
    await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
    await page.getByRole("button", { name: "Delete content" }).click();
  }
});

test("uploaded poster preview and download use the same managed file", async ({
  page,
  browser,
}) => {
  await loginAs(page, "admin");
  const title = `Secure messaging checklist ${Date.now()}`;
  await page.goto("/admin/awareness/posters");
  await page.getByRole("button", { name: "Add Poster", exact: true }).click();
  await page.getByLabel("Title *").fill(title);
  await page
    .getByLabel("Description / accessible alt-text basis")
    .fill("A three-step checklist for verifying unusual messages.");
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "secure-messaging.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByLabel("Alternative text *").fill("Three checks for safer community messages");
  await page.getByRole("button", { name: "Use this image" }).click();
  await expect(page.getByText("secure-messaging.png", { exact: true })).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption("Published");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();
  const guest = await browser.newContext();
  try {
    const publicPage = await guest.newPage();
    await publicPage.goto("/awareness/posters");
    await publicPage.getByRole("searchbox").fill(title);
    await expect(
      publicPage.getByAltText("Three checks for safer community messages"),
    ).toBeVisible();
    const downloadPromise = publicPage.waitForEvent("download");
    await publicPage.getByRole("link", { name: "Download PNG", exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("secure-messaging.png");
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("ncap.demo.v2") ?? "{}").state?.posters,
      ),
    ).toBeUndefined();
  } finally {
    await guest.close();
    await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
    await page.getByRole("button", { name: "Delete content" }).click();
  }
});
