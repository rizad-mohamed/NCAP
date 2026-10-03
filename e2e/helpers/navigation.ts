import { expect, test, type Page } from "@playwright/test";

export async function gotoApp(page: Page, path: string) {
  const destination = new URL(path, test.info().project.use.baseURL ?? page.url()).href;
  // Exercise visible application navigation when available. This also avoids
  // racing a full-document goto against the hydrated router in Firefox.
  const link = page
    .locator(`a[href=${JSON.stringify(path)}]:not([target="_blank"])`)
    .filter({ visible: true })
    .first();
  if (await link.count()) await link.click();
  else {
    try {
      await page.goto(path, { waitUntil: "commit" });
    } catch (error) {
      // Firefox sometimes reports cancellation after the correct page commits.
      // Only accept that browser signal if URL/readiness and the workflow's
      // subsequent UI/backend assertions succeed; all other errors still fail.
      if (
        page.context().browser()?.browserType().name() !== "firefox" ||
        !(error instanceof Error) ||
        !error.message.includes("NS_BINDING_ABORTED")
      )
        throw error;
      console.info("Firefox navigation cancellation: verifying the committed route and workflow.");
    }
  }
  await expect(page).toHaveURL(destination);
  await page.waitForLoadState("networkidle");
}

export async function reloadApp(page: Page) {
  const destination = page.url();
  try {
    await page.reload({ waitUntil: "commit" });
  } catch (error) {
    if (
      page.context().browser()?.browserType().name() !== "firefox" ||
      !(error instanceof Error) ||
      !error.message.includes("NS_BINDING_ABORTED")
    )
      throw error;
    console.info("Firefox reload cancellation: verifying the committed route and workflow.");
  }
  await expect(page).toHaveURL(destination);
  await page.waitForLoadState("networkidle");
}
