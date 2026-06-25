import { useState, useCallback, useEffect, useRef } from "react";
import { useAutoRefresh } from "./useAutoRefresh";

/**
 * Result returned by {@link usePollingFetch}.
 */
export interface PollingFetchResult<T> {
  /** Most recently fetched value, or `initial` before the first fetch completes. */
  data: T;
  /** `true` only during the initial fetch — background polls update silently. */
  loading: boolean;
  /** Error message from the most recent failed fetch, or `null`. */
  error: string | null;
  /** Manually triggers a fetch; runs silently (no `loading` flash). */
  refresh: () => Promise<void>;
  /** Number of consecutive failures since the last successful fetch. Resets to 0 on success. */
  consecutiveErrors: number;
}

export interface PollingFetchOptions {
  /**
   * Number of consecutive failures before the error is surfaced to the caller.
   * Useful for suppressing transient errors during service restarts (e.g. Docker daemon).
   * Default: `1` (surface immediately — preserves existing behaviour).
   */
  errorThreshold?: number;
}

/**
 * Fetches data on mount and then polls at a fixed interval.
 *
 * The initial load sets `loading = true`; subsequent background polls and manual
 * `refresh()` calls update `data` silently without a loading flash.
 *
 * @param fetcher    - Async function that returns the data. Wrap in `useCallback` to
 *   avoid restarting the interval on every render.
 * @param initial    - Value used for `data` before the first fetch resolves.
 * @param intervalMs - Polling interval in milliseconds.
 * @param paused     - When `true`, pauses background polling (does not cancel an in-flight request).
 * @param options    - Optional config (e.g. `errorThreshold`).
 */
export function usePollingFetch<T>(
  fetcher: () => Promise<T>,
  initial: T,
  intervalMs: number,
  paused = false,
  options: PollingFetchOptions = {},
): PollingFetchResult<T> {
  const { errorThreshold = 1 } = options;
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const failCountRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const result = await fetcher();
      failCountRef.current = 0;
      setConsecutiveErrors(0);
      setData(result);
      setError(null);
    } catch (e) {
      failCountRef.current++;
      setConsecutiveErrors(failCountRef.current);
      if (failCountRef.current >= errorThreshold) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher, errorThreshold]);

  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh, intervalMs, paused);

  return { data, loading, error, refresh, consecutiveErrors };
}
