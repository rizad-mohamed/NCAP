import { expect, test } from "@playwright/test";
import { axeForPage } from "./helpers/accessibility";
import { installPublicCatalogueFixtures } from "./helpers/public-catalogue";

const routes = [
  "/awareness",
  "/awareness/articles",
  "/awareness/tips",
  "/awareness/news",
  "/awareness/best-practices",
  "/awareness/posters",
  "/awareness/infographics",
  "/awareness/videos",
  "/learn",
  "/quizzes",
];

for (const width of [390, 1440]) {
  test(`catalogue pages share aligned controls and accessible cards at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(300000);
    await installPublicCatalogueFixtures(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator(".catalogue-hero")).toBeVisible();
      if (route !== "/awareness") {
        const toolbar = page.locator(".ncap-filter-toolbar");
        await expect(toolbar.getByRole("searchbox")).toBeVisible();
        const controls = await toolbar.locator("input, select").evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return { bottom: rect.bottom, height: rect.height };
          }),
        );
        expect(controls.every((control) => control.height >= 44)).toBe(true);
        if (width === 1440)
          expect(
            Math.max(...controls.map((c) => c.bottom)) - Math.min(...controls.map((c) => c.bottom)),
          ).toBeLessThanOrEqual(1);
      }
      const axe = await axeForPage(page)
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: testInfo.outputPath(`${route.replaceAll("/", "-")}.png`),
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  });
}

test("quiz search and difficulty can be combined and cleared", async ({ page }) => {
  await installPublicCatalogueFixtures(page);
  await page.goto("/quizzes", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Digital Safety Fundamentals", exact: true }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search quizzes" });
  await search.fill("No assessment matches this search");
  await page.getByRole("combobox", { name: "Difficulty" }).selectOption("Beginner");
  await expect(page.getByRole("heading", { name: "No quizzes match" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Difficulty" })).toHaveValue("All");
});
