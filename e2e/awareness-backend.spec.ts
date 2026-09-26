import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

test("bundled Awareness SVGs rasterize within production image limits", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1600 });
  await page.route("**/*", (route) => route.abort());
  const files = readdirSync("public/posters").filter((file) => file.endsWith(".svg"));
  expect(files).toHaveLength(6);
  for (const file of files) {
    const svg = readFileSync(resolve("public/posters", file), "utf8");
    await page.setContent(
      `<style>body{margin:0}svg{display:block;width:1200px;height:auto}</style>${svg}`,
    );
    const box = await page.locator("svg").boundingBox();
    const png = await page.locator("svg").screenshot({ type: "png" });
    expect(box!.width).toBeLessThanOrEqual(4096);
    expect(box!.height).toBeLessThanOrEqual(4096);
    expect(png.length).toBeLessThanOrEqual(5242880);
  }
});

test("Awareness reports a backend failure without falling back to local demo records", async ({
  page,
}) => {
  await page.route("**/_serverFn/**", (route) => route.abort());
  await page.goto("/awareness", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole("alert")).toContainText(/connection|unavailable|try again/i);
  await expect(page.getByText("How a phishing message is built", { exact: true })).toHaveCount(0);
});

test.describe("Awareness on migrated Supabase", () => {
  test.skip(
    process.env.AWARENESS_E2E !== "1",
    "Set AWARENESS_E2E=1 after applying the Awareness migration and seed import.",
  );
  test("seeded public articles, filters, details, downloads and transcripts", async ({ page }) => {
    await page.goto("/awareness/articles");
    await page.getByRole("searchbox").fill("phishing message");
    await expect(
      page.getByRole("heading", { name: "How a phishing message is built" }),
    ).toBeVisible();
    await page
      .getByRole("heading", { name: "How a phishing message is built" })
      .getByRole("link")
      .click();
    await expect(page.getByText(/Phishing messages are assembled from parts/)).toBeVisible();
    await page.goto("/awareness/posters");
    const download = page.waitForEvent("download");
    await page
      .getByRole("link", { name: /Download/ })
      .first()
      .click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
    await page.goto("/awareness/infographics");
    await page
      .getByRole("button", { name: /Open|View/ })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goto("/awareness/videos");
    await page
      .getByRole("button", { name: /Open transcript preview/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Transcript", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chapters", exact: true })).toBeVisible();
  });
  test("draft isolation across browsers, upload, replace, publish and remove", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "admin");
    const title = `Awareness storage test ${Date.now()}`;
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    // Generate two real PNGs with browser canvas; no fixture binaries or services required.
    const png = async (color: string) =>
      Buffer.from(
        await page.evaluate((color) => {
          const canvas = document.createElement("canvas");
          canvas.width = 20;
          canvas.height = 20;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 20, 20);
          return canvas.toDataURL("image/png").split(",")[1]!;
        }, color),
        "base64",
      );
    await page.goto("/admin/awareness/posters");
    await page.getByRole("button", { name: "Add Poster" }).click();
    await page.getByLabel("Title *").fill(title);
    await page
      .getByLabel("Description / accessible alt-text basis *", { exact: true })
      .fill("A managed test poster.");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "poster.png", mimeType: "image/png", buffer: await png("blue") });
    await page.getByLabel("Alternative text *").fill("Blue test poster");
    await page.getByRole("button", { name: "Use this image" }).click();
    await expect(page.getByText("Image uploaded. Save the record to attach it.")).toBeVisible();
    await page.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();
    await publicPage.goto("/awareness/posters");
    await publicPage.getByRole("searchbox").fill(title);
    await expect(publicPage.getByRole("heading", { name: title })).toHaveCount(0);
    await page.getByRole("button", { name: `Publish ${title}`, exact: true }).click();
    await publicPage.reload();
    await publicPage.getByRole("searchbox").fill(title);
    await expect(publicPage.getByRole("heading", { name: title })).toBeVisible();
    await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: await png("red") });
    await page.getByRole("button", { name: "Use this image" }).click();
    await expect(page.getByText("Image uploaded. Save the record to attach it.")).toBeVisible();
    await page.getByRole("button", { name: "Save record" }).click();
    await page.reload();
    await page.getByRole("button", { name: `Unpublish ${title}`, exact: true }).click();
    await publicPage.reload();
    await publicPage.getByRole("searchbox").fill(title);
    await expect(publicPage.getByRole("heading", { name: title })).toHaveCount(0);
    await page.getByRole("button", { name: `Delete ${title}`, exact: true }).click();
    await page.getByRole("button", { name: "Delete content" }).click();
    await expect(page.getByRole("cell", { name: title, exact: true })).toHaveCount(0);
    await publicContext.close();
  });
});
