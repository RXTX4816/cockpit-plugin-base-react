import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionStorage } from "./useSessionStorage";

// sessionStorage is not mocked globally in setup.ts, so stub it here.
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal("sessionStorage", sessionStorageMock);

beforeEach(() => { sessionStorage.clear(); });

describe("useSessionStorage", () => {
  it("returns the default value when key is absent", () => {
    const { result } = renderHook(() => useSessionStorage("test-key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads an existing value on mount", () => {
    sessionStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() => useSessionStorage("test-key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("setValue updates state and persists", () => {
    const { result } = renderHook(() => useSessionStorage("test-key", "default"));
    act(() => { result.current[1]("updated"); });
    expect(result.current[0]).toBe("updated");
    expect(JSON.parse(sessionStorage.getItem("test-key")!)).toBe("updated");
  });

  it("remove resets to default and clears storage", () => {
    sessionStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() => useSessionStorage("test-key", "default"));
    act(() => { result.current[2](); });
    expect(result.current[0]).toBe("default");
    expect(sessionStorage.getItem("test-key")).toBeNull();
  });
});
