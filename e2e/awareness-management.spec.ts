import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test("a newly administered awareness type completes the public publication lifecycle", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The repository lifecycle browser audit runs once.",
  );
  const title = "Check unexpected verification requests";

  await loginAs(page, "admin");
  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add Cyber Tip" }).click();
  await page.getByLabel("Title *").fill(title);
  await page
    .getByLabel("Tip text")
    .fill("Confirm the request through a contact method you already trust.");
  await page.getByLabel("Status").selectOption("Published");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();
  await page.goto("/awareness/tips", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "Search cyber tips" }).fill("verification requests");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByLabel("Tip text").fill("Pause, then verify through a trusted contact method.");
  await page.getByRole("button", { name: "Save record" }).click();
  await page.goto("/awareness/tips", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Pause, then verify through a trusted contact method."),
  ).toBeVisible();

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: `Unpublish ${title}` }).click();
  await page.goto("/awareness/tips", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: `Publish ${title}` }).click();
  await page.goto("/awareness/tips", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/admin/awareness/cyber-tips", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page.getByRole("button", { name: "Delete content" }).click();
  await expect(page.getByRole("cell", { name: title, exact: true })).toHaveCount(0);
  await page.goto("/awareness/tips", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});
