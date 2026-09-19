import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test("authentication forms validate locally and expose no demo access bypass", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Continue as/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveCount(2);

  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /demo/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert")).toHaveCount(4);
  await page.getByRole("textbox", { name: /^Password / }).fill("SecretValue!2026");
  expect(await page.evaluate(() => localStorage.getItem("ncap.demo.v2"))).not.toContain(
    "SecretValue!2026",
  );
});

test("protected learner and administrator routes redirect anonymous visitors", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Ftopics$/);
});

test("administrator can create, reject a duplicate, delete a topic, and export a report", async ({
  page,
}) => {
  await loginAs(page, "admin");
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
