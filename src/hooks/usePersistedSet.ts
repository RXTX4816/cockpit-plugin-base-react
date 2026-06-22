import { useState, useCallback } from "react";

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
export function usePersistedSet(storageKey: string) {
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

  return { items, toggle, clear };
}
