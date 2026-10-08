import { expect, test } from "@playwright/test";
import { axeForPage } from "./helpers/accessibility";
import { loginAs, waitForAuthHydration } from "./helpers/auth";

test("authentication forms validate locally and expose no demo access bypass", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await waitForAuthHydration(page);
  await expect(page.getByRole("button", { name: /Continue as/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveCount(2);

  await page.goto("/register", { waitUntil: "networkidle" });
  await waitForAuthHydration(page);
  const registrationAudit = await axeForPage(page)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(registrationAudit.violations).toEqual([]);
  await expect(page.getByRole("button", { name: /demo/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert")).toHaveCount(4);
  await page.getByRole("textbox", { name: /^Password / }).fill("SecretValue!2026");
  expect(await page.evaluate(() => localStorage.getItem("ncap.demo.v2"))).not.toContain(
    "SecretValue!2026",
  );
});

// Each redirect starts in a fresh page so a previous route's hydration cannot
// interrupt the next navigation in WebKit.
for (const route of ["/dashboard", "/admin/topics"]) {
  test(`anonymous visitors to ${route} reach the login form`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      `http://127.0.0.1:4173/login?redirect=${encodeURIComponent(route)}`,
    );
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  });
}

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
