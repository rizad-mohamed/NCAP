import { expect, test } from "@playwright/test";

test("lesson progress, bookmark state, and a quiz draft survive reload", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue as Learner" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/learn/lessons/l-updates", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Bookmark lesson" }).click();
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Remove bookmark" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completed" })).toBeDisabled();

  await page.goto("/quizzes/q-passwords", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Start quiz" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Submit answer" }).click();
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByText(/Question 2 of/)).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Question 2 of/)).toBeVisible();

  const draft = await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem("ncap.demo.v2") ?? "{}") as {
      state?: { quizDrafts?: Record<string, { currentIndex: number; answers: unknown }> };
    };
    return value.state?.quizDrafts?.["q-passwords"];
  });
  expect(draft?.currentIndex).toBe(1);
  expect(Object.keys(draft?.answers ?? {})).toHaveLength(1);
});
