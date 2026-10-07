import { test, expect as baseExpect } from "@playwright/test";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { gotoApp } from "./helpers/navigation";

const expect = baseExpect.configure({ timeout: 20000 });
const env = loadEnv("development", process.cwd(), "");
test.use({ trace: "off" });
test.describe("registration staging limits", () => {
  test.skip(
    process.env["REGISTRATION_STAGING_TESTS"] !== "1",
    "Requires confirmed staging and email quota reproduction.",
  );
  test.setTimeout(180000);
  test("five single-consumption registrations reach the provider; sixth reaches the NCAP limit", async ({
    page,
  }) => {
    expect(new URL(env.SUPABASE_URL).hostname).toBe("zsaefnfgauqvstptetdw.supabase.co");
    const email = `ncap-registration-${randomUUID()}@example.invalid`;
    const password = `${randomBytes(24).toString("base64url")}aA1!`;
    const bucket = createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY)
      .update(`register:local-development:${email}`)
      .digest("hex");
    const headers = {
      authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "content-type": "application/json",
    };
    const sql = async (query: string, readOnly = true) => {
      const response = await fetch(
        "https://api.supabase.com/v1/projects/zsaefnfgauqvstptetdw/database/query",
        { method: "POST", headers, body: JSON.stringify({ query, read_only: readOnly }) },
      );
      if (!response.ok) throw new Error(`Staging verification failed (${response.status}).`);
      return response.json();
    };
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") posts++;
    });
    try {
      await gotoApp(page, "/register");
      // Verify hydration before filling controlled fields.
      const passwordInput = page.locator('input[name="password"]');
      await expect
        .poll(async () => {
          if ((await passwordInput.getAttribute("type")) === "password")
            await page.getByRole("button", { name: "Show password", exact: true }).first().click();
          return passwordInput.getAttribute("type");
        })
        .toBe("text");
      await page.locator('input[name="name"]').fill("Disposable registration");
      await page.locator('input[name="email"]').fill(email);
      await passwordInput.fill(password);
      await page.locator('input[name="confirm"]').fill(password);
      await page.getByRole("checkbox").check();
      const button = page.getByRole("button", { name: "Create account", exact: true });
      for (let attempt = 1; attempt <= 6; attempt++) {
        // Two synchronous submit events exercise the ref guard before React
        // commits the disabled state. No network route is mocked.
        await page.locator("form").evaluate((form) => {
          (form as HTMLFormElement).requestSubmit();
          (form as HTMLFormElement).requestSubmit();
        });
        await expect(button).toBeEnabled();
        await expect(page.getByRole("alert")).toHaveText(
          attempt <= 5
            ? "Verification email requests are temporarily limited. Please try again later."
            : "Too many registration attempts. Please wait and try again.",
        );
        await expect
          .poll(
            async () =>
              (
                await sql(
                  `select attempts from private.auth_attempt_limits where bucket='${bucket}'`,
                )
              )[0]?.attempts,
          )
          .toBe(attempt);
        expect(posts).toBe(attempt);
        await expect(page).toHaveURL(/\/register$/);
      }
    } finally {
      const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      for (const { id } of await sql(`select id from auth.users where email='${email}'`)) {
        const { error } = await service.auth.admin.deleteUser(id);
        expect(Boolean(error), "Disposable registration cleanup failed.").toBe(false);
      }
      await sql(`delete from private.auth_attempt_limits where bucket='${bucket}'`, false);
    }
  });
});
