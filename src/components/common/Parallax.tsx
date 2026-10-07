import { useEffect, useRef, type ReactNode } from "react";

/** Decorative only: leave interactive content and the document's scroll untouched. */
export function Parallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (preference.matches || !desktop.matches) {
        element.style.removeProperty("--parallax-y");
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = Math.max(
        -18,
        Math.min(18, (window.innerHeight / 2 - rect.top - rect.height / 2) * 0.045),
      );
      element.style.setProperty("--parallax-y", `${offset}px`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", schedule);
    desktop.addEventListener("change", schedule);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", schedule);
      desktop.removeEventListener("change", schedule);
      window.cancelAnimationFrame(frame);
      element.style.removeProperty("--parallax-y");
    };
  }, []);
  return (
    <div ref={ref} className="ncap-parallax">
      {children}
    </div>
  );
}
