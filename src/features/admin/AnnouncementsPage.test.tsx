import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement } from "@/data/types";
import { ConfirmationPanel } from "@/components/common/ConfirmationPanel";
import { AdminAnnouncementsPage } from "./DashboardSections";

const mocks = vi.hoisted(() => ({
  data: [] as Announcement[],
  pending: false,
  error: false,
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/services/dashboard-hooks", () => ({
  useDashboardAnnouncements: () => ({
    data: mocks.data,
    isPending: mocks.pending,
    isError: mocks.error,
    save: { mutateAsync: mocks.save, isPending: false },
    remove: { mutateAsync: mocks.remove, isPending: false },
  }),
}));
vi.mock("@/lib/i18n", () => ({
  useInterfaceText: () => (text: string) => text,
  useI18n: () => ({ language: "en" }),
}));
vi.mock("./AdminCharts", () => ({ AdminReportCharts: () => null }));

const announcement: Announcement = {
  id: "notice-1",
  title: "Account safety",
  body: "Keep your recovery codes somewhere safe.",
  audience: "New Learners",
  active: true,
  startsAt: "2026-10-01",
  endsAt: "2026-10-31",
};
beforeEach(() => {
  mocks.data = [announcement];
  mocks.pending = false;
  mocks.error = false;
  mocks.save.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("announcement workspace", () => {
  it("opens a focused editor and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Edit Account safety" });
    await user.click(trigger);
    const editor = screen.getByRole("dialog", { name: "Announcement editor" });
    await waitFor(() => expect(editor).toContainElement(document.activeElement as HTMLElement));
    expect(within(editor).getByLabelText("Title")).toHaveValue(announcement.title);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("retains a dirty draft when the user declines to discard it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Edit Account safety" }));
    const editor = screen.getByRole("dialog", { name: "Announcement editor" });
    await user.type(within(editor).getByLabelText("Title"), " updated");
    await user.keyboard("{Escape}");
    const confirmation = await screen.findByRole("alertdialog");
    expect(confirmation).toHaveTextContent("Discard unsaved announcement changes?");
    await user.click(within(confirmation).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(editor).toBeInTheDocument();
    expect(within(editor).getByLabelText("Title")).toHaveValue("Account safety updated");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("sends the original audience, dates and active flag to the existing mutation", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Edit Account safety" }));
    const editor = screen.getByRole("dialog", { name: "Announcement editor" });
    fireEvent.change(within(editor).getByLabelText("Message"), {
      target: { value: "Updated message" },
    });
    await user.click(within(editor).getByRole("button", { name: "Save announcement" }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({ ...announcement, body: "Updated message" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("offers filter recovery when records exist but none match", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    await user.type(screen.getByRole("searchbox"), "missing notice");
    expect(screen.getByRole("heading", { name: "No announcements match" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Account safety" })).toBeInTheDocument();
  });

  it("does not show a misleading empty state while loading or after an error", () => {
    mocks.data = [];
    mocks.pending = true;
    const { rerender } = render(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading announcements");
    expect(screen.queryByRole("heading", { name: "No announcements" })).not.toBeInTheDocument();
    mocks.pending = false;
    mocks.error = true;
    rerender(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No announcements" })).not.toBeInTheDocument();
  });

  it("paginates records without losing filtering or changing data", async () => {
    const user = userEvent.setup();
    mocks.data = Array.from({ length: 9 }, (_, i) => ({
      ...announcement,
      id: String(i),
      title: `Notice ${i + 1}`,
    }));
    render(
      <>
        <AdminAnnouncementsPage />
        <ConfirmationPanel />
      </>,
    );
    expect(screen.queryByRole("heading", { name: "Notice 9" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("heading", { name: "Notice 9" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "Notice 1");
    expect(screen.getByRole("heading", { name: "Notice 1" })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
