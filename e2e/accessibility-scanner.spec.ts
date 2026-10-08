import { expect, test } from "@playwright/test";
import { axeForPage } from "./helpers/accessibility";

test("accessibility scanner detects a real violation across repeated scans", async ({ page }) => {
  test.setTimeout(90000);
  const source = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="navy"/></svg>')}`;
  // A substantial, stable DOM exercises report transfer without hydration or
  // external data changing the positive control while its scan runs.
  await page.setContent(`<!doctype html><html lang="en"><head>
    <title>Accessibility scanner control</title>
    <style>body{color:#132d40;background:white;font:16px/1.5 Arial}h2{font-size:20px}button{min-height:44px}</style>
    </head><body><main><h1>Accessibility scanner control</h1>
    <img id="accessibility-positive-control" width="24" height="24" alt="Accessible test marker"
      style="position:fixed;top:16px;right:16px" src="${source}">
    <ul>${Array.from({ length: 120 }, (_, index) => `<li><h2>Resource ${index + 1}</h2><p>Readable fixture content.</p><button type="button">Review resource ${index + 1}</button></li>`).join("")}</ul>
    </main></body></html>`);
  const image = page.locator("#accessibility-positive-control");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element) => {
        const picture = element as HTMLImageElement;
        return picture.complete && picture.naturalWidth > 0;
      }),
    )
    .toBe(true);
  const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
  const initial = await axeForPage(page).withTags(tags).analyze();
  expect(initial.violations).toEqual([]);
  await image.evaluate((element) => element.removeAttribute("alt"));
  const broken = await axeForPage(page).withTags(tags).analyze();
  await expect(image).toBeVisible();
  expect(
    broken.violations.some(
      (violation) =>
        violation.id === "image-alt" &&
        violation.nodes.some((node) => node.target.includes("#accessibility-positive-control")),
    ),
  ).toBe(true);
  await image.evaluate((element) => element.setAttribute("alt", "Accessible test marker"));
  const restored = await axeForPage(page).withTags(tags).analyze();
  expect(restored.violations).toEqual([]);
});
