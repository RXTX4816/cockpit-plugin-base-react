import { useState, useCallback, useEffect } from "react";

export interface UseLayoutOptions {
  /** When true, subscribes to StorageEvent to stay in sync across browser tabs. */
  crossTabSync?: boolean;
}

export function useLayout<T extends string>(
  storageKey: string,
  defaultLayout: T,
  validLayouts: T[],
  options: UseLayoutOptions = {},
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

  useEffect(() => {
    if (!options.crossTabSync) return;
    const handler = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      if (e.storageArea !== null && e.storageArea !== localStorage) return;
      if (e.newValue && (validLayouts as string[]).includes(e.newValue)) {
        setLayoutState(e.newValue as T);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, options.crossTabSync]);

  return [layout, setLayout];
}
