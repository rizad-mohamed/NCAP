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
  // The SSR form is visible before hydration; wait for its initial session request
  // to settle so React does not replace values entered into the unhydrated form.
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(account.email!);
  await page.locator('input[name="password"]').fill(account.password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(account.destination, { timeout: 20000 });
}
