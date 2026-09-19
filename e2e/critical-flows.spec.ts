import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test("public navigation and responsive layout remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Safer digital habits");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations.filter(({ impact }) => impact === "critical" || impact === "serious"),
  ).toEqual([]);

  await page.goto("/awareness/articles", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Read, understand, act" })).toBeVisible();
});

test("learner and administrator boundaries route correctly", async ({ page }) => {
  await loginAs(page, "learner");

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard$/);

  await loginAs(page, "admin");

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Topics" })).toBeVisible();
});
