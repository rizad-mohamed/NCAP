import { expect, test, type Page } from "@playwright/test";

type TestRole = "learner" | "admin";

const credentials = {
  learner: {
    email: process.env.E2E_LEARNER_EMAIL,
    password: process.env.E2E_LEARNER_PASSWORD,
    destination: /\/dashboard$/,
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    destination: /\/admin\/?$/,
  },
} as const;

export async function loginAs(page: Page, role: TestRole) {
  const account = credentials[role];
  test.skip(
    !account.email || !account.password,
    `Set E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD to run authenticated Supabase tests.`,
  );

  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(account.email!);
  await page.getByLabel("Password").fill(account.password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(account.destination);
}
