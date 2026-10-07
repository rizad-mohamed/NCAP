import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";

async function audit(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("public language switching preserves navigation, layout and reduced motion", async ({
  page,
}) => {
  // Nine full axe scans exceed the standard 60s budget on Windows Firefox/WebKit.
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    for (const [code, label] of [
      ["si", "සිංහල"],
      ["ta", "தமிழ்"],
      ["en", "English"],
    ]) {
      await page.getByRole("button", { name: /^(Language|භාෂාව|மொழி):/ }).click();
      await page.getByRole("menuitem").filter({ hasText: label }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page);
      const duration = await page
        .locator("main")
        .evaluate((element) => getComputedStyle(element).animationDuration);
      expect(parseFloat(duration)).toBeLessThanOrEqual(0.001);
    }
  }
  expect(errors).toEqual([]);
});

test("desktop awareness menu supports keyboard dismissal and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "Browse NCAP awareness and learning areas." });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Articles", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Articles", exact: true })).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const role of ["learner", "admin"] as const) {
  test(`${role} redesign has accessible layouts and review screenshots`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Role screenshot review runs once; the existing suites cover the browser matrix.",
    );
    test.setTimeout(180000);
    await loginAs(page, role);
    const routes =
      role === "learner"
        ? ["/dashboard", "/learn", "/quizzes", "/certificates", "/profile"]
        : ["/admin", "/admin/users", "/admin/reports", "/admin/announcements"];
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(route, { waitUntil: "networkidle" });
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`${width}-${route.replaceAll("/", "-")}.png`),
          fullPage: true,
          timeout: 60000,
        });
      }
      if (role === "admin") {
        const trigger = page.getByRole("button", { name: "New announcement", exact: true });
        await trigger.click();
        const editor = page.getByRole("dialog", { name: "Announcement editor" });
        await expect(editor).toBeVisible();
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`${width}-announcement-editor.png`),
          timeout: 60000,
        });
        await page.keyboard.press("Escape");
        await expect(editor).not.toBeVisible();
        await expect(trigger).toBeFocused();
      }
    }
  });
}
