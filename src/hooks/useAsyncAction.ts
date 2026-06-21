import { useState, useCallback } from "react";

/**
 * Wraps an async function with `loading` and `error` state.
 *
 * @param action - The async function to execute. A new stable reference should be
 *   passed via `useCallback` to avoid unnecessary re-renders.
 * @returns An object with `execute` (calls the action), `loading`, `error`, and
 *   `clearError` (resets the error state).
 */
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
