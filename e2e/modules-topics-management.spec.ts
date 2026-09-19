import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test("administered modules and topics drive the learner catalogue lifecycle", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(
    testInfo.project.name !== "chromium",
    "The complete local repository lifecycle runs once.",
  );
  const topic = "Community Digital Safety";
  const title = "Community Device Safety";

  await loginAs(page, "admin");
  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Manage Modules & Topics" })).toBeVisible();

  await page.getByRole("button", { name: "Create topic" }).click();
  await page.getByLabel("Topic name *").fill("Community Safety");
  await page.getByRole("button", { name: "Save topic" }).click();
  await page.getByRole("button", { name: "Edit Community Safety" }).click();
  await page.getByLabel("Topic name *").fill(topic);
  await page.getByRole("button", { name: "Save topic" }).click();
  await page.getByRole("button", { name: `Deactivate ${topic}` }).click();
  await expect(page.getByRole("button", { name: `Activate ${topic}` })).toBeVisible();
  await page.getByRole("button", { name: `Activate ${topic}` }).click();

  await page.getByRole("tab", { name: "Modules" }).click();
  await page.getByRole("button", { name: "Create module" }).click();
  await page.getByLabel("Module title *").fill(title);
  await page
    .getByLabel("Description *")
    .fill("Practical device protection for community learning spaces.");
  const moduleDialog = page.getByRole("dialog");
  await moduleDialog.getByRole("combobox").nth(0).selectOption(topic);
  await moduleDialog.getByRole("combobox").nth(1).selectOption("Beginner");
  await page.getByLabel("Duration in minutes").fill("35");
  await moduleDialog.getByRole("combobox").nth(2).selectOption("Published");
  await page
    .getByLabel("Learning objectives")
    .fill("Secure a shared device\nRespond safely when a device is lost");
  await page.getByRole("button", { name: "Save module" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Unpublish ${title}` })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Modules" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.goto("/learn", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("link", { name: "View module" }).last().click();
  await expect(page.getByText("Secure a shared device")).toBeVisible();

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Modules" }).click();
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByLabel("Module title *").fill("Community Device Protection");
  await page.getByRole("button", { name: "Save module" }).click();
  await page.goto("/learn", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Community Device Protection" })).toBeVisible();

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Modules" }).click();
  await page.getByRole("button", { name: "Unpublish Community Device Protection" }).click();
  await expect(
    page.getByRole("button", { name: "Publish Community Device Protection" }),
  ).toBeVisible();
  await page.goto("/learn", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Community Device Protection" })).toHaveCount(0);

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Modules" }).click();
  await page.getByRole("button", { name: "Publish Community Device Protection" }).click();
  await page.getByRole("button", { name: "Delete Community Device Protection" }).click();
  await page.getByRole("button", { name: "Delete module" }).click();
  await expect(page.getByText("Community Device Protection", { exact: true })).toHaveCount(0);

  await page.getByRole("tab", { name: "Topics" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${topic}` }).click();
  await expect(page.getByText(topic, { exact: true })).toHaveCount(0);
});

test("sign in and sign up omit the global site footer", async ({ page }) => {
  for (const route of ["/login", "/register"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("footer")).toHaveCount(0);
  }
  await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
  await expect(page.locator("footer")).toHaveCount(1);
});
