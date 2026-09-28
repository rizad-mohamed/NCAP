import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs } from "./helpers/auth";

test("Learning module images validate, upload, replace and retire through the backend", async ({
  page,
}) => {
  test.skip(
    process.env.LEARNING_E2E !== "1",
    "Requires confirmed staging and disposable accounts.",
  );
  test.setTimeout(120_000);
  await loginAs(page, "admin");
  await page.goto("/admin/topics");
  await page.getByRole("tab", { name: "modules", exact: true }).click();
  await page.getByRole("button", { name: "Create module" }).click();
  const dialog = page.getByRole("dialog");
  const title = `Learning image verification ${Date.now()}`;
  await dialog.getByLabel("Module title *").fill(title);
  await dialog.getByLabel("Description *").fill("Disposable Learning media verification.");
  await dialog.getByLabel("Learning objectives").fill("Verify managed images");
  await dialog.getByLabel("Alternative text *").fill("Verification image");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await dialog.getByRole("button", { name: "Use this image" }).click();
  await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 96;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#123456";
    context.fillRect(0, 0, 192, 96);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  const upload = async () => {
    const existing = dialog.getByRole("img", { name: "Verification image", exact: true });
    const previous = (await existing.count()) ? await existing.getAttribute("src") : null;
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "verification.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await dialog.getByRole("button", { name: "Use this image" }).click();
    const preview = dialog.getByRole("img", { name: "Verification image", exact: true });
    if (previous) await expect(preview).not.toHaveAttribute("src", previous, { timeout: 30000 });
    await expect(preview).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/learning-media\//, {
      timeout: 30000,
    });
    await expect
      .poll(() => preview.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBe(192);
    return (await preview.getAttribute("src"))!;
  };
  // Keep the browser-valid metadata but corrupt the uploaded bytes to exercise
  // server finalization rather than only browser-side decoding validation.
  await page.route(
    "**/storage/v1/object/upload/sign/learning-media/**",
    (route) => route.continue({ postData: Buffer.alloc(Buffer.from(png, "base64").length) }),
    { times: 1 },
  );
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "verification.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await dialog.getByRole("button", { name: "Use this image" }).click();
  await expect(
    page.getByText(/The uploaded file is unreadable or its metadata does not match/),
  ).toBeVisible({ timeout: 30000 });
  // Signed downloads can be served from the CDN after deletion. Verify removal
  // through authenticated Storage listing, using the same disposable admin role.
  const storageClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const signIn = await storageClient.auth.signInWithPassword({
    email: process.env.E2E_ADMIN_EMAIL!,
    password: process.env.E2E_ADMIN_PASSWORD!,
  });
  expect(signIn.error).toBeNull();
  const objectExists = async (signedUrl: string) => {
    const path = decodeURIComponent(new URL(signedUrl).pathname.split("/learning-media/")[1]!);
    const separator = path.lastIndexOf("/");
    const file = path.slice(separator + 1);
    const result = await storageClient.storage
      .from("learning-media")
      .list(path.slice(0, separator), { search: file });
    expect(result.error).toBeNull();
    return result.data!.some((object) => object.name === file);
  };
  const originalUrl = await upload();
  expect(await objectExists(originalUrl)).toBe(true);
  await dialog.getByRole("button", { name: "Save module", exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
  const replacementUrl = await upload();
  expect(replacementUrl).not.toBe(originalUrl);
  expect(await objectExists(replacementUrl)).toBe(true);
  await dialog.getByRole("button", { name: "Save module", exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 30000 });
  await expect.poll(async () => objectExists(originalUrl)).toBe(false);
  await page.getByRole("button", { name: `Publish ${title}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Unpublish ${title}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
  await page.getByRole("button", { name: "Delete module", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  // The catalogue refresh completes before the asynchronous storage retirement.
  await expect(page.getByText("Module deleted", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => objectExists(replacementUrl)).toBe(false);
});
