import { expect, type Page } from "@playwright/test";

export async function confirmDialog(page: Page, message: string, reason?: string) {
  const dialog = page.getByRole("alertdialog", { name: "Confirm action" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(message, { exact: true })).toBeVisible();
  if (reason !== undefined)
    await dialog.getByRole("textbox", { name: "Reason", exact: true }).fill(reason);
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
