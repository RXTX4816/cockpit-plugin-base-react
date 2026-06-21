import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { getServiceStatus } from "./api";
import type { ServiceStatus } from "./types";

const DEFAULT_INTERVAL = 5000;

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
