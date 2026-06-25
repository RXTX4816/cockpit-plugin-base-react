import { useState, useCallback } from "react";

export interface SessionStorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

function read<T>(key: string, defaultValue: T, deserialize: (r: string) => T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw !== null) return deserialize(raw);
  } catch { /* ignore */ }
  return defaultValue;
}

function write<T>(key: string, value: T, serialize: (v: T) => string): void {
  try { sessionStorage.setItem(key, serialize(value)); } catch { /* ignore */ }
}

/**
 * Typed sessionStorage hook. Value is scoped to the current tab and is not
 * shared across tabs (sessionStorage semantics).
 *
 * @param key          - sessionStorage key.
 * @param defaultValue - Value used when the key is absent or unreadable.
 * @param options      - Optional serialization config.
 * @returns `[value, setValue, remove]`
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T,
  options: SessionStorageOptions<T> = {},
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
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    setValueState(defaultValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue, remove];
}
