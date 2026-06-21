import { useState, useCallback } from "react";

export function useLayout<T extends string>(
  storageKey: string,
  defaultLayout: T,
  validLayouts: T[],
): [T, (layout: T) => void] {
  const [layout, setLayoutState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && (validLayouts as string[]).includes(stored)) return stored as T;
    } catch { /* ignore */ }
    return defaultLayout;
  });

  const setLayout = useCallback((next: T) => {
    try { localStorage.setItem(storageKey, next); } catch { /* ignore */ }
    setLayoutState(next);
  }, [storageKey]);

  return [layout, setLayout];
}
