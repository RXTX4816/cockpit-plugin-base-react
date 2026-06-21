import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "./useAutoRefresh";

export interface PollingFetchResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Initial fetch shows loading=true; subsequent background polls update silently.
 * Calling refresh() manually also runs silently (no loading flash).
 */
export function usePollingFetch<T>(
  fetcher: () => Promise<T>,
  initial: T,
  intervalMs: number,
  paused = false,
): PollingFetchResult<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh, intervalMs, paused);

  return { data, loading, error, refresh };
}
