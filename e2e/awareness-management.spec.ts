import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

// Wait for initial SSR hydration before interacting with the live backend.
test.describe.configure({ timeout: 120000 });

test("a newly administered awareness type completes the public publication lifecycle", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium" || process.env.AWARENESS_E2E !== "1",
    "Set AWARENESS_E2E=1 on a migrated test project; the lifecycle audit runs once.",
  );
  const title = `Check unexpected verification requests ${Date.now()}`;

  await loginAs(page, "admin");
  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Create cyber tip" }).click();
  await page.getByLabel("Title *").fill(title);
  await page
    .getByLabel("Tip text")
    .fill("Confirm the request through a contact method you already trust.");
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("Published");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();
  await page.goto("/awareness/tips", { waitUntil: "networkidle" });
  await page.getByRole("searchbox", { name: "Search cyber tips" }).fill("verification requests");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByLabel("Tip text").fill("Pause, then verify through a trusted contact method.");
  await page.getByRole("button", { name: "Save record" }).click();
  await page.goto("/awareness/tips", { waitUntil: "networkidle" });
  await expect(
    page.getByText("Pause, then verify through a trusted contact method."),
  ).toBeVisible();

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Unpublish ${title}` }).click();
  await page.goto("/awareness/tips", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Publish ${title}` }).click();
  await page.goto("/awareness/tips", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page.getByRole("button", { name: "Delete content" }).click();
  await expect(page.getByRole("cell", { name: title, exact: true })).toHaveCount(0);
  await page.goto("/awareness/tips", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});
