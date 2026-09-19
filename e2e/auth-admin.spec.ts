import { expect, test } from "@playwright/test";

test("registration validates inputs and gates the learner workspace on demo verification", async ({
  page,
}) => {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create demo profile" }).click();
  await expect(page.getByRole("alert")).toHaveCount(4);

  await page.getByLabel("Full name").fill("  Nadeesha Perera  ");
  await page.getByLabel("Email address").fill("nadeesha@example.lk");
  await page.getByRole("textbox", { name: /^Password / }).fill("Learning2026");
  await page.getByRole("textbox", { name: /^Confirm password / }).fill("Learning2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create demo profile" }).click();

  await expect(page).toHaveURL(/\/verify-email$/);
  const pending = await page.evaluate(() => ({
    profile: sessionStorage.getItem("ncap.verify.profile"),
    storedState: localStorage.getItem("ncap.demo.v2"),
  }));
  expect(pending.profile).toContain("Nadeesha Perera");
  expect(JSON.stringify(pending)).not.toContain("Learning2026");

  await page.getByRole("button", { name: "Simulate verification" }).click();
  await page.getByRole("link", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nadeesha");
});

test("administrator can create, reject a duplicate, delete a topic, and export a report", async ({
  page,
}) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Administrator" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Create topic" }).click();
  await page.getByLabel("Topic name").fill("Secure Messaging");
  await page.getByRole("button", { name: "Save topic" }).click();
  await expect(page.getByRole("cell", { name: "Secure Messaging", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create topic" }).click();
  await page.getByLabel("Topic name").fill(" secure messaging ");
  await page.getByRole("button", { name: "Save topic" }).click();
  await expect(page.getByText("A topic with this name already exists.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Secure Messaging" }).click();
  await expect(page.getByRole("cell", { name: "Secure Messaging", exact: true })).toHaveCount(0);

  await page.goto("/admin/reports", { waitUntil: "domcontentloaded" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ncap-demo-report.csv");
});
