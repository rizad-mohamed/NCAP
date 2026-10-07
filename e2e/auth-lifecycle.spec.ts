import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { reloadApp } from "./helpers/navigation";
import { loadEnv } from "vite";
import { randomBytes, randomUUID } from "node:crypto";
import { interfaceText } from "../src/lib/i18n";

// Explicit opt-in: never run privileged fixture creation against a CI/production URL.
const env = loadEnv("development", process.cwd(), "");
test.use({ trace: "off" });
test("disposable staging account persists profile, switches accounts and loses suspended access", async ({
  page,
  browser,
  browserName,
}) => {
  test.skip(
    process.env["AUTH_STAGING_TESTS"] !== "1",
    "Requires explicitly confirmed staging and server test credentials.",
  );
  expect(new URL(env.SUPABASE_URL).hostname, "Confirmed staging backend required").toBe(
    "zsaefnfgauqvstptetdw.supabase.co",
  );
  test.setTimeout(180_000);
  const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ids: string[] = [];
  const password = `${randomBytes(24).toString("base64url")}aA1!`;
  const create = async (name: string) => {
    const email = `ncap-auth-e2e-${randomUUID()}@example.invalid`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (error || !data.user) throw new Error("Disposable staging fixture could not be created.");
    ids.push(data.user.id);
    return { id: data.user.id, email };
  };
  const login = async (email: string, destination = /\/dashboard$/, remember = false) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    const input = page.locator('input[name="password"]');
    await expect
      .poll(async () => {
        if ((await input.getAttribute("type")) === "password")
          await page.getByRole("button", { name: "Show password", exact: true }).click();
        return input.getAttribute("type");
      })
      .toBe("text");
    // The authenticated/guest language can differ during account switching.
    // Identify the existing email control independently of its translated label.
    await page.locator('input[name="email"]').fill(email);
    await input.fill(password);
    const rememberControl = page.getByRole("checkbox");
    await expect(rememberControl).toHaveCount(1);
    await rememberControl.setChecked(remember);
    const signInResponse = page.waitForResponse(
      (response) => response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const response = await signInResponse;
    const flags = (await response.headersArray())
      .filter(
        (header) => header.name.toLowerCase() === "set-cookie" && header.value.startsWith("sb-"),
      )
      .map((header) => ({
        httpOnly: /;\s*HttpOnly(?:;|$)/i.test(header.value),
        sameSiteLax: /;\s*SameSite=Lax(?:;|$)/i.test(header.value),
      }));
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((flag) => flag.httpOnly && flag.sameSiteLax)).toBe(true);
    await expect(page).toHaveURL(destination, { timeout: 30000 });
    await page.waitForURL(destination, { waitUntil: "networkidle", timeout: 30000 });
    await reloadApp(page);
    await expect(page).toHaveURL(destination, { timeout: 30000 });
  };
  try {
    const alice = await create("Auth Alice");
    const bob = await create("Auth Bob");
    await login(alice.email, /\/dashboard$/, true);
    const cookies = await page.context().cookies();
    const sessionCookies = cookies.filter((cookie) => cookie.name.startsWith("sb-"));
    expect(sessionCookies.length).toBeGreaterThan(0);
    // Upstream Playwright expects None for cookie metadata on native Windows WebKit:
    // https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts
    // Every browser still verifies the actual issued SameSite=Lax header above.
    const reportedSameSite =
      browserName === "webkit" && process.platform === "win32" ? "None" : "Lax";
    for (const cookie of sessionCookies) {
      expect({ httpOnly: cookie.httpOnly, sameSite: cookie.sameSite }).toEqual({
        httpOnly: true,
        sameSite: reportedSameSite,
      });
      expect(cookie.expires).toBeGreaterThan(0);
    }
    await page.goto("/profile/edit", { waitUntil: "networkidle" });
    await page.getByLabel("Full name").fill("Persisted Alice");
    await page.getByLabel("Phone number").fill("+94123456789");
    await page.getByLabel("Preferred language").selectOption("ta");
    const interests = page.locator('fieldset input[type="checkbox"]');
    if (await interests.count()) await interests.first().check();
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page).toHaveURL(/\/profile\/?$/);
    await expect(page.getByRole("heading", { name: "Persisted Alice", exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Persisted Alice", exact: true })).toBeVisible();
    await page.goto("/admin/users", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/dashboard$/);

    // A new browser context has no localStorage or cached profile.
    const fresh = await browser.newContext();
    await fresh.addCookies(await page.context().cookies());
    const second = await fresh.newPage();
    await second.goto("http://127.0.0.1:4173/profile/edit", { waitUntil: "networkidle" });
    await expect(second.locator("html")).toHaveAttribute("lang", "ta");
    await expect(second.getByLabel(interfaceText("ta", "Full name"))).toHaveValue(
      "Persisted Alice",
    );
    await expect(second.getByLabel("Phone number")).toHaveValue("+94123456789");
    await expect(second.getByLabel("Preferred language")).toHaveValue("ta");
    await fresh.close();
    await page.goto("/profile", { waitUntil: "networkidle" });
    // Mobile and desktop share the sidebar logout control.
    const logout = page.getByRole("button", { name: interfaceText("ta", "Log out"), exact: true });
    if (!(await logout.isVisible())) {
      await page.getByRole("button", { name: "Open workspace navigation", exact: true }).click();
    }
    await logout.click();
    await expect(page).toHaveURL("http://127.0.0.1:4173/", { timeout: 30000 });
    await page.waitForURL("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", {
        name: "Safer digital habits for every Sri Lankan.",
        exact: true,
      }),
    ).toBeVisible();
    await reloadApp(page);
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login\?/);
    await login(bob.email);
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Auth Bob", exact: true })).toBeVisible();
    await expect(page.getByText("Persisted Alice", { exact: true })).toHaveCount(0);
    const suspended = await service
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", bob.id);
    if (suspended.error) throw new Error("Disposable suspension failed.");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login\?/);
    const restored = await service.from("profiles").update({ status: "active" }).eq("id", bob.id);
    if (restored.error) throw new Error("Disposable restoration failed.");
    await login(bob.email);
    // Reuse a disposable identity to verify the existing administrator avatar UI.
    const admins = await service
      .from("profiles")
      .select("id")
      .eq("role", "super_admin")
      .eq("status", "active");
    expect(admins.data?.length).toBeGreaterThan(0);
    expect(
      (await service.from("profiles").update({ role: "super_admin" }).eq("id", alice.id)).error,
    ).toBeNull();
    await page.context().clearCookies();
    await login(alice.email, /\/admin\/?$/);
    await page.goto("/admin/profile", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await page.getByRole("button", { name: "Use this image", exact: true }).click();
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByText("Administrator profile updated", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator('img[src^="data:image/png;base64,"]')).toBeVisible();
  } finally {
    for (const id of ids) {
      const { error } = await service.auth.admin.deleteUser(id);
      expect(error, "Disposable staging fixture cleanup must succeed.").toBeNull();
    }
  }
});
