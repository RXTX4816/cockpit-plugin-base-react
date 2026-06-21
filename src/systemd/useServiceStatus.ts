import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { getServiceStatus } from "./api";
import type { ServiceStatus } from "./types";

const DEFAULT_INTERVAL = 5000;

/**
 * Polls the status of a systemd unit and returns reactive state.
 *
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 * @param intervalMs - How often to re-poll. Defaults to `5000` ms.
 * @returns `{ status, loading, error, refresh }` — call `refresh()` to force an immediate re-poll.
 */
export function useServiceStatus(unit: string, intervalMs = DEFAULT_INTERVAL) {
  const [status, setStatus] = useState<ServiceStatus>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getServiceStatus(unit);
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [unit]);

  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh, intervalMs);

  return { status, loading, error, refresh };
}
