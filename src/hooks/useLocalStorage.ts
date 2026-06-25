import { useState, useCallback, useEffect } from "react";

export interface LocalStorageOptions<T> {
  /** When true, subscribes to StorageEvent to stay in sync across browser tabs. */
  crossTabSync?: boolean;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

function read<T>(key: string, defaultValue: T, deserialize: (r: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return deserialize(raw);
  } catch { /* ignore */ }
  return defaultValue;
}

function write<T>(key: string, value: T, serialize: (v: T) => string): void {
  try { localStorage.setItem(key, serialize(value)); } catch { /* ignore */ }
}

/**
 * Typed localStorage hook with optional cross-tab synchronisation.
 *
 * @param key           - localStorage key.
 * @param defaultValue  - Value used when the key is absent or unreadable.
 * @param options       - Optional serialization and cross-tab sync config.
 * @returns `[value, setValue, remove]`
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: LocalStorageOptions<T> = {},
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const serialize = options.serialize ?? JSON.stringify;
  const deserialize = options.deserialize ?? (JSON.parse as (r: string) => T);

  const [value, setValueState] = useState<T>(() => read(key, defaultValue, deserialize));

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState(prev => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      write(key, resolved, serialize);
      return resolved;
    });
  }, [key, serialize]);

  const remove = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    setValueState(defaultValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!options.crossTabSync) return;
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      if (e.storageArea !== null && e.storageArea !== localStorage) return;
      setValueState(e.newValue !== null ? deserialize(e.newValue) : defaultValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, options.crossTabSync]);

  return [value, setValue, remove];
}
