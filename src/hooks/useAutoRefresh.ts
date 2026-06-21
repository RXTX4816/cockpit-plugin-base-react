import { useEffect, useRef, useState } from "react";

/**
 * Calls `fn` on a repeating interval, pausing automatically when the browser tab is hidden.
 *
 * @param fn - The callback to invoke on each tick. May be async — rejections are swallowed.
 * @param intervalMs - Interval duration in milliseconds.
 * @param paused - When `true`, suspends polling without tearing down the effect.
 */
export function useAutoRefresh(
  fn: () => void | Promise<void>,
  intervalMs: number,
  paused = false,
): void {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  const [tabHidden, setTabHidden] = useState(() => document.hidden);
  useEffect(() => {
    const handler = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (paused || tabHidden) return;
    const t = setInterval(() => void fnRef.current(), intervalMs);
    return () => clearInterval(t);
  }, [paused, tabHidden, intervalMs]);
}
