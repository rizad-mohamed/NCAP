import { useRef } from "react";

let pointerTrigger: HTMLElement | null = null;
let pointerAt = 0;
/** Safari does not focus all clicked buttons; remember the actual invoking control. */
export function trackPanelTriggers() {
  const pointer = (event: PointerEvent) => {
    pointerAt = performance.now();
    pointerTrigger =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('button, a[href], [role="button"]')
        : null;
  };
  const keyboard = () => {
    pointerTrigger = null;
  };
  document.addEventListener("pointerdown", pointer, true);
  document.addEventListener("keydown", keyboard, true);
  return () => {
    document.removeEventListener("pointerdown", pointer, true);
    document.removeEventListener("keydown", keyboard, true);
    pointerTrigger = null;
  };
}
export function panelTrigger() {
  return pointerTrigger?.isConnected && performance.now() - pointerAt < 1000
    ? pointerTrigger
    : document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
}
export function usePanelFocus(onOpen?: (event: Event) => void, onClose?: (event: Event) => void) {
  const trigger = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event: Event) => {
      trigger.current = panelTrigger();
      onOpen?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      onClose?.(event);
      if (!event.defaultPrevented && trigger.current?.isConnected) {
        event.preventDefault();
        trigger.current.focus({ preventScroll: true });
      }
    },
  };
}
