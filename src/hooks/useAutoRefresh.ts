import { useEffect, useRef, useState } from "react";

// A call is allowed to occupy at most this fraction of its own interval before it's treated
// as too expensive for the current cadence — even if it technically finishes in time. A call
// that reliably eats, say, 60% of every cycle is still pegging the CPU nonstop; "did it finish
// before the deadline" is the wrong question on constrained hardware, "how much of the cycle
// did it cost" is the right one.
const TARGET_DUTY_CYCLE = 0.1;

// However slow or expensive a call was, the next one is delayed by at most this multiple of
// intervalMs, so one very slow outlier can't stall polling for an unreasonably long time.
const MAX_BACKOFF_MULTIPLIER = 8;

/**
 * Calls `fn` on a repeating interval, pausing automatically when the browser tab is hidden.
 *
 * Self-paces via recursive `setTimeout` rather than a fixed `setInterval`: the next call is
 * scheduled after the previous one *settles*, not from a fixed clock. This keeps at most one
 * call in flight at a time — if `fn` takes longer than `intervalMs` (e.g. a slow subprocess
 * spawn on constrained hardware), later ticks are delayed rather than stacking concurrent
 * calls on top of each other.
 *
 * It also backs off adaptively based on cost, not just deadline misses: if a call ate more
 * than `TARGET_DUTY_CYCLE` of its own interval, the next one is delayed enough to bring that
 * ratio back down (capped at `intervalMs * MAX_BACKOFF_MULTIPLIER`) — a call that's technically
 * "on time" but consistently expensive still gets backed off, not just one that overruns
 * outright. A cheap, fast call keeps the normal `intervalMs` cadence, so this self-tunes down
 * on slow hardware and back up again as soon as calls are cheap, with no configuration needed.
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
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = (delay: number) => { timer = setTimeout(tick, delay); };
    const tick = () => {
      const startedAt = Date.now();
      Promise.resolve(fnRef.current())
        .catch(() => { /* swallowed — same as the previous fire-and-forget behavior */ })
        .finally(() => {
          if (cancelled) return;
          const elapsed = Date.now() - startedAt;
          const nextDelay = Math.min(
            Math.max(intervalMs, elapsed / TARGET_DUTY_CYCLE),
            intervalMs * MAX_BACKOFF_MULTIPLIER,
          );
          schedule(nextDelay);
        });
    };
    schedule(intervalMs);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [paused, tabHidden, intervalMs]);
}
