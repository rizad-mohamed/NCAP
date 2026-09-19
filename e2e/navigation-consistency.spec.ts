import { expect, test, type Locator } from "@playwright/test";

const desktopNavigation = [
  "Awareness",
  "Learn",
  "Quizzes",
  "Resources",
  "News & Updates",
  "Search NCAP learning",
];

const accessibleLinkNames = async (navigation: Locator) =>
  navigation
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("aria-label") || link.textContent?.trim() || ""),
    );

test("public pages share the Home desktop navigation structure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const route of ["/", "/awareness", "/awareness/articles", "/awareness/news"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    const topLevelLinks = navigation.locator(":scope > a, :scope > div > a");
    await expect(topLevelLinks).toHaveCount(desktopNavigation.length);
    await expect(page.locator('[title="Sri Lanka"]').first()).toBeVisible();

    const names = await topLevelLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("aria-label") || link.textContent?.trim() || ""),
    );
    expect(names, `desktop navigation differs at ${route}`).toEqual(desktopNavigation);
    await expect(page.getByRole("link", { name: "Sign In", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign Up", exact: true })).toBeVisible();
  }
});

test("public pages share the Home mobile navigation structure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let homeNames: string[] = [];

  for (const route of ["/", "/awareness", "/awareness/articles"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(navigation.getByRole("link", { name: "Awareness hub" })).toBeVisible();
    const names = await accessibleLinkNames(navigation);
    if (route === "/") homeNames = names;
    else expect(names, `mobile navigation differs at ${route}`).toEqual(homeNames);
    await expect(navigation.getByRole("link", { name: "Resources", exact: true })).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "News & Updates", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign Up", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(navigation).not.toBeVisible();
  }
});

test("authenticated public navigation replaces redundant authentication actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Learner" }).click();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Sign In", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign Up", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open dashboard", exact: true })).toBeVisible();
});

test("awareness administration follows the Modules and Topics section pattern", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Administrator" }).click();

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  const topicsTab = page.getByRole("tab", { name: "topics", exact: true });
  const referenceStyle = await topicsTab.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderBottomColor: style.borderBottomColor,
      borderBottomWidth: style.borderBottomWidth,
      borderRadius: style.borderRadius,
      fontWeight: style.fontWeight,
      minHeight: style.minHeight,
    };
  });

  await page.goto("/admin/awareness/articles", { waitUntil: "domcontentloaded" });
  const awarenessNavigation = page.getByRole("navigation", { name: "Awareness content types" });
  const articlesTab = awarenessNavigation.getByRole("link", { name: "Articles", exact: true });
  const awarenessStyle = await articlesTab.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderBottomColor: style.borderBottomColor,
      borderBottomWidth: style.borderBottomWidth,
      borderRadius: style.borderRadius,
      fontWeight: style.fontWeight,
      minHeight: style.minHeight,
    };
  });

  expect(awarenessStyle).toEqual(referenceStyle);
  await expect(page.getByRole("heading", { level: 2, name: "Articles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create article" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Filter articles" })).toBeVisible();
});
