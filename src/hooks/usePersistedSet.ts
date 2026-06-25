import { useState, useCallback, useEffect } from "react";

export interface PersistedSetOptions {
  /** When true, subscribes to StorageEvent to stay in sync across browser tabs. */
  crossTabSync?: boolean;
}

function load(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function save(storageKey: string, items: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...items]));
  } catch { /* ignore */ }
}

// localStorage-backed Set<string> with toggle and clear.
// Useful for accordion expanded state, multi-selection, etc.
export function usePersistedSet(
  storageKey: string,
  options: PersistedSetOptions = {},
) {
  const [items, setItems] = useState<Set<string>>(() => load(storageKey));

  const toggle = useCallback((id: string) => {
    setItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      save(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const clear = useCallback(() => {
    setItems(new Set());
    save(storageKey, new Set());
  }, [storageKey]);

  useEffect(() => {
    if (!options.crossTabSync) return;
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey && (e.storageArea === null || e.storageArea === localStorage)) {
        setItems(load(storageKey));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey, options.crossTabSync]);

  return { items, toggle, clear };
}
