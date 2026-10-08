import { useEffect, useState, useSyncExternalStore } from "react";
import { useInterfaceText } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { panelTrigger, trackPanelTriggers } from "./panel-focus";

type Request = {
  id: number;
  message: string;
  reason: boolean;
  trigger: HTMLElement | null;
  resolve: (value: string | null) => void;
};
let pending: Request | null = null;
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
function settle(value: string | null) {
  const request = pending;
  pending = null;
  emit();
  request?.resolve(value);
}
function request(message: string, reason: boolean) {
  // A second request cancels the first; one approval must never authorize two actions.
  settle(null);
  return new Promise<string | null>((resolve) => {
    pending = {
      id: ++nextId,
      message,
      reason,
      resolve,
      trigger: panelTrigger(),
    };
    emit();
  });
}
export async function confirmAction(message: string) {
  return (await request(message, false)) !== null;
}
export function requestReason(message: string) {
  return request(message, true);
}

/** Single accessible host for all application confirmations and reason prompts. */
export function ConfirmationPanel() {
  const uiText = useInterfaceText();
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => pending,
    () => null,
  );
  useEffect(() => () => settle(null), []);
  useEffect(trackPanelTriggers, []);
  useEffect(() => {
    const cancel = () => settle(null);
    window.addEventListener("popstate", cancel);
    return () => window.removeEventListener("popstate", cancel);
  }, []);
  return current ? (
    <ConfirmationRequest key={current.id} request={current} uiText={uiText} />
  ) : null;
}
function ConfirmationRequest({
  request: current,
  uiText,
}: {
  request: Request;
  uiText: (text: string) => string;
}) {
  const [reason, setReason] = useState("");
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) settle(null);
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (current.trigger?.isConnected) current.trigger.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{uiText("Confirm action")}</AlertDialogTitle>
          <AlertDialogDescription>{current.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!current.reason || reason.trim()) settle(current.reason ? reason : "confirmed");
          }}
        >
          {current.reason && (
            <label className="text-sm font-semibold">
              {uiText("Reason")}
              <Input
                autoFocus
                required
                maxLength={1000}
                className="mt-2"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(null)}>{uiText("Cancel")}</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={current.reason && !reason.trim()}>
              {uiText("Confirm")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
