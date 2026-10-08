import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export function axeForPage(page: Page) {
  const builder = new AxeBuilder({ page });
  // Windows WebKit can corrupt large JSON reports in repeated scans. On pages
  // without child frames, scan the same DOM in-page and return every violation
  // without the unused passed-check node metadata. Retain frame-aware scans
  // elsewhere; no accessibility rule is disabled.
  // https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/error-handling.md
  if (
    process.platform === "win32" &&
    page.context().browser()?.browserType().name() === "webkit" &&
    page.frames().length === 1
  ) {
    builder.setLegacyMode(true).options({ reporter: "no-passes" });
  }
  return builder;
}
