import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const widths = [320, 375, 390, 768, 1024, 1366, 1440, 1920];

const learnerRoutes = [
  "/dashboard",
  "/learn",
  "/learn/search",
  "/learn/modules/m-fundamentals",
  "/learn/lessons/l-what-is-risk",
  "/quizzes",
  "/quizzes/q-fundamentals",
  "/quizzes/q-fundamentals/run",
  "/quizzes/q-fundamentals/results",
  "/bookmarks",
  "/certificates",
  "/profile",
  "/profile/edit",
] as const;

const adminRoutes = [
  "/admin",
  "/admin/users",
  "/admin/lessons",
  "/admin/awareness/articles",
  "/admin/awareness/cyber-tips",
  "/admin/awareness/updates",
  "/admin/awareness/best-practices",
  "/admin/awareness/posters",
  "/admin/awareness/infographics",
  "/admin/awareness/videos",
  "/admin/topics",
  "/admin/questions",
  "/admin/reports",
  "/admin/certificates",
  "/admin/announcements",
  "/admin/profile",
] as const;

async function expectNoDocumentOverflow(page: import("@playwright/test").Page, route: string) {
  await expect(page.locator("main")).toBeVisible();
  const result = await page.evaluate(() => {
    const viewportRight = document.documentElement.clientWidth;
    return {
      overflow: document.documentElement.scrollWidth - viewportRight,
      offenders: [...document.body.querySelectorAll("*")]
        .filter((element) => element.getBoundingClientRect().right > viewportRight + 1)
        .slice(0, 8)
        .map((element) => ({
          className: typeof element.className === "string" ? element.className : "",
          right: Math.round(element.getBoundingClientRect().right),
          tag: element.tagName,
          text: element.textContent?.trim().slice(0, 60),
        })),
    };
  });
  expect(
    result.overflow,
    `${route}\n${JSON.stringify(result.offenders, null, 2)}`,
  ).toBeLessThanOrEqual(1);
}

for (const width of widths) {
  test(`public and authentication layouts do not overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The exhaustive width matrix runs once in desktop Chromium.",
    );
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const route of ["/", "/awareness/articles", "/login"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoDocumentOverflow(page, `${route} at ${width}px`);
    }
  });
}

for (const width of widths) {
  test(`learner workspace routes do not overflow at ${width}px`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The exhaustive authenticated width matrix runs once in desktop Chromium.",
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await loginAs(page, "learner");
    for (const route of learnerRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoDocumentOverflow(page, `${route} at ${width}px`);
    }
  });

  test(`administrator workspace routes do not overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The exhaustive authenticated width matrix runs once in desktop Chromium.",
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await loginAs(page, "admin");
    for (const route of adminRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoDocumentOverflow(page, `${route} at ${width}px`);
    }
  });
}

test("core public, auth, learner, and admin pages have no serious axe findings", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The extended axe audit runs once in Chromium.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const audit = async (route: string) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      result.violations.filter(({ impact }) => impact === "critical" || impact === "serious"),
      `axe findings for ${route}`,
    ).toEqual([]);
  };

  await audit("/");
  await audit("/login");
  await loginAs(page, "learner");
  await audit("/dashboard");
  await loginAs(page, "admin");
  await audit("/admin/topics");
});

test("learner dashboard reflows at an effective 320px with 200 percent text", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The text reflow audit runs once in Chromium.");
  await page.setViewportSize({ width: 640, height: 900 });
  await loginAs(page, "learner");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const oversized = await page.locator("body *").evaluateAll((elements) =>
    elements
      .filter(
        (element) =>
          element.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
      )
      .slice(0, 12)
      .map((element) => ({
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80),
      })),
  );
  expect(overflow, JSON.stringify(oversized, null, 2)).toBeLessThanOrEqual(1);
});
