import { gotoApp } from "./helpers/navigation";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { loginAs } from "./helpers/auth";

const enabled = process.env.ADMIN_MODULES_E2E === "1";
const moduleId = process.env.E2E_MODULE_ID ?? "";
const moduleTitle = process.env.E2E_MODULE_TITLE ?? "";
const quizTitle = process.env.E2E_QUIZ_TITLE ?? "";
const learnerName = process.env.E2E_LEARNER_NAME ?? "";
const lessonTitle = `Live lesson ${process.env.E2E_RUN_ID ?? "verification"}`;
const editedLessonTitle = `${lessonTitle} updated`;
const questionText = `Which answer is safest? ${process.env.E2E_RUN_ID ?? "verification"}`;

test.describe("live administrator content, reports and certificates", () => {
  test.skip(
    !enabled,
    "Created and run by scripts/admin-modules-live.mjs with disposable staging data.",
  );

  test("administrator controls use the authoritative content and question backends", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await gotoApp(page, "/admin/lessons");
    await page.getByRole("button", { name: "Add lesson" }).click();
    const editor = page.getByRole("dialog", { name: "Add lesson" });
    await editor.getByLabel("Title *").fill(lessonTitle);
    await editor
      .getByLabel("Summary and content introduction")
      .fill("Disposable live integration lesson.");
    await editor.getByLabel("Module").selectOption(moduleId);
    await editor.getByLabel("Status").selectOption("Draft");
    await editor.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByText(lessonTitle, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Preview ${lessonTitle}` }).click();
    const lessonPreview = page.getByRole("dialog", { name: `Preview ${lessonTitle}` });
    await expect(lessonPreview.getByText("Add clear lesson content here.")).toBeVisible();
    await lessonPreview.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: `Edit ${lessonTitle}` }).click();
    const edit = page.getByRole("dialog", { name: "Edit lesson" });
    await edit.getByLabel("Title *").fill(editedLessonTitle);
    await edit.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByText(editedLessonTitle, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Publish ${editedLessonTitle}` }).click();
    await expect(
      page.getByRole("button", { name: `Unpublish ${editedLessonTitle}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Unpublish ${editedLessonTitle}` }),
    ).toBeEnabled();
    await page.getByRole("button", { name: `Unpublish ${editedLessonTitle}` }).click();
    await expect(page.getByRole("button", { name: `Publish ${editedLessonTitle}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Delete ${editedLessonTitle}` })).toBeEnabled();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Delete ${editedLessonTitle}` }).click();
    await expect(page.getByText("Lesson deleted", { exact: true })).toBeVisible();
    await expect(page.getByText(editedLessonTitle, { exact: true })).toHaveCount(0);

    await gotoApp(page, "/admin/questions");
    await page.getByRole("button", { name: new RegExp(quizTitle) }).click();
    await page.getByRole("button", { name: "Add question" }).click();
    const questionEditor = page.getByRole("dialog", { name: "Question editor" });
    await questionEditor.getByLabel("Question").fill(questionText);
    const answers = questionEditor.locator('fieldset input:not([type="radio"])');
    await answers.nth(0).fill("Use a unique passphrase");
    await answers.nth(1).fill("Reuse a short password");
    await answers.nth(2).fill("Share the password");
    await answers.nth(3).fill("Write it in public");
    await questionEditor.getByRole("radio", { name: "Correct answer 1" }).check();
    await questionEditor
      .getByLabel("Explanation")
      .fill("Unique passphrases limit credential reuse.");
    await questionEditor.getByLabel("Status").selectOption("Published");
    await questionEditor.getByRole("button", { name: "Save question" }).click();
    await expect(page.getByText(questionText, { exact: true })).toBeVisible();
    const questionCard = page
      .getByText(questionText, { exact: true })
      .locator("xpath=ancestor::article");
    await questionCard.getByRole("button", { name: "Unpublish" }).click();
    await expect(questionCard.getByRole("button", { name: "Publish" })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await questionCard.getByRole("button", { name: "Delete question" }).click();
    await expect(page.getByText(questionText, { exact: true })).toHaveCount(0);
  });

  test("reports export the full selected backend state and print real results", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await gotoApp(page, "/admin/reports");
    await page.getByLabel("Module").selectOption(moduleId);
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(page.getByRole("cell", { name: quizTitle, exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    const csvPath = await download.path();
    expect(csvPath).toBeTruthy();
    expect(await readFile(csvPath!, "utf8")).toContain(quizTitle);
    await page.evaluate(() => {
      window.print = () => document.body.setAttribute("data-print-invoked", "true");
    });
    await page.getByRole("button", { name: "Print" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-print-invoked", "true");
  });

  test("the existing Awareness workspace persists edits and publication", async ({ page }) => {
    const title = `Live awareness ${process.env.E2E_RUN_ID}`;
    await loginAs(page, "admin");
    await gotoApp(page, "/admin/awareness/cyber-tips");
    await page.getByRole("button", { name: "Create cyber tip" }).click();
    await page.getByLabel("Title *").fill(title);
    await page.getByLabel("Tip text").fill("Verify unexpected requests through a trusted contact.");
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("Published");
    await page.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: `Edit ${title}` }).click();
    await page.getByLabel("Tip text").fill("Pause, then verify through a trusted contact.");
    await page.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await gotoApp(page, "/awareness/tips");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await gotoApp(page, "/admin/awareness/cyber-tips");
    await page.getByRole("button", { name: `Unpublish ${title}` }).click();
    await expect(page.getByRole("button", { name: `Publish ${title}` })).toBeVisible();
    await gotoApp(page, "/awareness/tips");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
    await gotoApp(page, "/admin/awareness/cyber-tips");
    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await page.getByRole("button", { name: "Delete content" }).click();
    await expect(page.getByRole("cell", { name: title, exact: true })).toHaveCount(0);
  });

  test("administrator issuance, learner access, PDF download, verification and revocation work", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await loginAs(page, "admin");
    await gotoApp(page, "/admin/certificates");
    await page.getByPlaceholder("Search learners or modules…").fill(learnerName);
    const row = page
      .getByRole("row")
      .filter({ hasText: learnerName })
      .filter({ hasText: moduleTitle });
    await expect(row.getByText("Eligible", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Mark issued" }).click();
    await expect(row.getByText("Issued", { exact: true })).toBeVisible();
    const reference = (await row.locator("td").nth(6).textContent())!.trim();
    await row.getByRole("button", { name: "Preview" }).click();
    const preview = page.getByRole("dialog", { name: "Certificate preview" });
    await expect(preview.getByText(learnerName, { exact: true })).toBeVisible();
    const pdfDownload = page.waitForEvent("download");
    await preview.getByRole("button", { name: "Download PDF" }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toBe(`NCAP-${reference}.pdf`);
    const pdfPath = testInfo.outputPath("certificate.pdf");
    await pdf.saveAs(pdfPath);
    await testInfo.attach("server certificate PDF", {
      path: pdfPath,
      contentType: "application/pdf",
    });

    await loginAs(page, "learner");
    await gotoApp(page, "/certificates");
    await expect(page.getByRole("heading", { name: moduleTitle })).toBeVisible();
    await expect(page.getByText(`NCAP-${reference}`, { exact: false })).toBeVisible();
    await gotoApp(page, `/verify-certificate?reference=${reference}`);
    await expect(page.getByRole("heading", { name: "Verified certificate" })).toBeVisible();

    await loginAs(page, "admin");
    await gotoApp(page, "/admin/certificates");
    await page.getByPlaceholder("Search learners or modules…").fill(learnerName);
    page.once("dialog", (dialog) => dialog.accept("Disposable live verification complete"));
    await page
      .getByRole("row")
      .filter({ hasText: learnerName })
      .filter({ hasText: moduleTitle })
      .getByRole("button", { name: "Revoke" })
      .click();
    await expect(page.getByText("Certificate revoked")).toBeVisible();
    await gotoApp(page, `/verify-certificate?reference=${reference}`);
    await expect(
      page.getByRole("heading", { name: "Invalid / unverified certificate" }),
    ).toBeVisible();
    await expect(page.getByText("This certificate has been revoked.")).toBeVisible();
  });
});
