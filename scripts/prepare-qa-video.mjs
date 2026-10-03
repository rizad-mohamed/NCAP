import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { recordVideoFixture } from "../e2e/helpers/video.ts";

// A generated canvas recording contains no licensed third-party media or personal data.
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const bytes = await recordVideoFixture(page, "video/webm");
  await mkdir(".qa.local", { recursive: true });
  await writeFile(".qa.local/awareness.webm", Buffer.from(bytes));
  console.log("Generated disposable Awareness video fixture.");
} finally {
  await browser.close();
}
