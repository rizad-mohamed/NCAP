import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { ConfirmationPanel, confirmAction, requestReason } from "./ConfirmationPanel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

vi.mock("@/lib/i18n", () => ({ useInterfaceText: () => (text: string) => text }));
afterEach(cleanup);

it("requires explicit approval, preserves cancellation, and returns focus", async () => {
  const action = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <button
        onClick={async () => {
          if (await confirmAction("Delete this record?")) action();
        }}
      >
        Delete record
      </button>
      <ConfirmationPanel />
    </>,
  );
  const trigger = screen.getByRole("button", { name: "Delete record" });
  await user.click(trigger);
  expect(action).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(action).not.toHaveBeenCalled();
  await waitFor(() => expect(trigger).toHaveFocus());
  await user.click(trigger);
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirm" }),
  );
  await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
});

it("requires a nonempty reason and sends the entered text unchanged", async () => {
  const action = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <button
        onClick={async () => {
          const reason = await requestReason("Reason for revocation:");
          if (reason !== null) action(reason);
        }}
      >
        Revoke
      </button>
      <ConfirmationPanel />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Revoke" }));
  expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await user.type(screen.getByLabelText("Reason"), "Security review");
  await user.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => expect(action).toHaveBeenCalledWith("Security review"));
});

it("cancels the outstanding request when its host unmounts", async () => {
  let outcome: Promise<boolean> | undefined;
  const user = userEvent.setup();
  const view = render(
    <>
      <button
        onClick={() => {
          outcome = confirmAction("Delete?");
        }}
      >
        Delete
      </button>
      <ConfirmationPanel />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Delete" }));
  view.unmount();
  await expect(outcome).resolves.toBe(false);
});

it("cancels pending destructive approval when browser history changes", async () => {
  let outcome: Promise<boolean> | undefined;
  const user = userEvent.setup();
  render(
    <>
      <button
        onClick={() => {
          outcome = confirmAction("Delete?");
        }}
      >
        Delete
      </button>
      <ConfirmationPanel />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "Delete" }));
  window.dispatchEvent(new PopStateEvent("popstate"));
  await expect(outcome).resolves.toBe(false);
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
});

it("restores focus for a controlled preview opened without a Radix trigger", async () => {
  function Preview() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Preview</button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Preview content</DialogTitle>
            <button>Download</button>
          </DialogContent>
        </Dialog>
        <ConfirmationPanel />
      </>
    );
  }
  const user = userEvent.setup();
  render(<Preview />);
  const trigger = screen.getByRole("button", { name: "Preview" });
  await user.click(trigger);
  await waitFor(() =>
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement),
  );
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
