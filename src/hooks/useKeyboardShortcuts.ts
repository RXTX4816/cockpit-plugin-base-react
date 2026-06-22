import { useEffect } from "react";

// Binds keyboard event handlers. Skips when the user is typing in a form field
// or a PatternFly modal is open.
export function useKeyboardShortcuts(
  handlers: Record<string, () => void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = [],
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) return;
      if (document.querySelector(".pf-v6-c-modal-box")) return;

      const key = e.key.toLowerCase();
      const fn = handlers[key];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
