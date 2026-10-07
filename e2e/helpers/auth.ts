import { expect, test, type Page } from "@playwright/test";
import { reloadApp } from "./navigation";

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
  const password = page.locator('input[name="password"]');
  // An interactive client-only state change proves hydration has completed;
  // network-idle alone can precede hydration on the Windows WebKit profile.
  await expect
    .poll(
      async () => {
        if ((await password.getAttribute("type")) === "password")
          await page.getByRole("button", { name: "Show password", exact: true }).click();
        return password.getAttribute("type");
      },
      { timeout: 20000 },
    )
    .toBe("text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByLabel("Email address").fill(account.email!);
  await password.fill(account.password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(account.destination, { timeout: 20000 });
  // Firefox can expose the destination URL before its full-document login
  // redirect finishes. Do not let the next workflow abort that navigation.
  await page.waitForURL(account.destination, { waitUntil: "networkidle", timeout: 20000 });
  // Start module verification from a fully loaded authenticated document so a
  // late guest-route redirect cannot race the workflow's first navigation.
  await reloadApp(page);
  await expect(page).toHaveURL(account.destination, { timeout: 20000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
