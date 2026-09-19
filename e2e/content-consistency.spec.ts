import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe.configure({ timeout: 60_000 });

test("administered article taxonomy is reflected on the public frontend", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The CRUD consistency audit runs once.");

  await loginAs(page, "admin");
  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Create topic" }).click();
  await page.getByLabel("Topic name").fill("Secure Messaging");
  await page.getByRole("button", { name: "Save topic" }).click();

  await page.goto("/admin/articles", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add article" }).click();
  await page.getByLabel("Title *").fill("Safer community messaging");
  await page.getByLabel("Summary").fill("Verify unusual requests before sharing a code.");
  await page.getByLabel("Topic").selectOption({ label: "Secure Messaging" });
  await page.getByLabel("Status").selectOption("Published");
  await page.getByLabel("Author").fill("NCAP Content Review Team");
  await page.getByLabel("Reading minutes").fill("4");
  await page
    .getByLabel("Article body *")
    .fill(
      "Pause when a message creates urgency.\n\nConfirm through a contact method you already trust.",
    );
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("cell", { name: "Safer community messaging", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem("ncap.demo.v2") ?? "{}") as {
          state?: { articles?: { title: string }[] };
        };
        return saved.state?.articles?.some(
          (article) => article.title === "Safer community messaging",
        );
      }),
    )
    .toBe(true);

  await page.goto("/awareness/articles", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Filter by topic").selectOption("Secure Messaging");
  await expect(page.getByRole("link", { name: "Safer community messaging" })).toBeVisible();
  await page.getByRole("link", { name: "Safer community messaging" }).click();
  await expect(page.getByText("By NCAP Content Review Team")).toBeVisible();
  await expect(page.getByText("4 minute read")).toBeVisible();

  await page.goto("/admin/topics", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Edit Secure Messaging" }).click();
  await page.getByLabel("Topic name").fill("Safer Messaging");
  await page.getByRole("button", { name: "Save topic" }).click();

  await page.goto("/awareness/articles", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Filter by topic").selectOption("Safer Messaging");
  await expect(page.getByRole("link", { name: "Safer community messaging" })).toBeVisible();
});

test("an uploaded poster is the same asset previewed and downloaded publicly", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The IndexedDB media audit runs once.");

  await loginAs(page, "admin");
  await page.goto("/admin/posters", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add poster" }).click();
  await page.getByLabel("Title *").fill("Secure messaging checklist");
  await page
    .getByLabel("Description / accessible alt-text basis")
    .fill("A three-step checklist for verifying unusual messages.");
  await page.locator('input[type="file"]').setInputFiles({
    name: "secure-messaging.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Alternative text *").fill("Three checks for safer community messages");
  await page.getByRole("button", { name: "Use this image" }).click();
  await expect(page.getByText("secure-messaging.png")).toBeVisible();
  await page.getByLabel("Status").selectOption("Published");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("cell", { name: "Secure messaging checklist", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem("ncap.demo.v2") ?? "{}") as {
          state?: { posters?: { title: string }[] };
        };
        return saved.state?.posters?.some(
          (poster) => poster.title === "Secure messaging checklist",
        );
      }),
    )
    .toBe(true);

  await page.goto("/awareness/posters", { waitUntil: "domcontentloaded" });
  await expect(page.getByAltText("Three checks for safer community messages")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("secure-messaging.png");
});
