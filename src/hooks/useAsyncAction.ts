import { useState, useCallback } from "react";

export function useAsyncAction<T>(
  action: () => Promise<T>,
): {
  execute: () => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const execute = useCallback(async (): Promise<T | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      return result;
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : String(ex));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [action]);

  return { execute, loading, error, clearError };
}
