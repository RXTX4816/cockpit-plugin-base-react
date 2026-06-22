import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedSet } from "./usePersistedSet";

const KEY = "test:persisted-set";

beforeEach(() => {
  localStorage.clear();
});

describe("usePersistedSet", () => {
  it("starts empty when localStorage has no entry", () => {
    const { result } = renderHook(() => usePersistedSet(KEY));
    expect(result.current.items.size).toBe(0);
  });

  it("loads initial state from localStorage", () => {
    localStorage.setItem(KEY, JSON.stringify(["a", "b"]));
    const { result } = renderHook(() => usePersistedSet(KEY));
    expect(result.current.items.has("a")).toBe(true);
    expect(result.current.items.has("b")).toBe(true);
  });

  it("toggle adds an item not in the set", () => {
    const { result } = renderHook(() => usePersistedSet(KEY));
    act(() => { result.current.toggle("x"); });
    expect(result.current.items.has("x")).toBe(true);
  });

  it("toggle removes an item already in the set", () => {
    const { result } = renderHook(() => usePersistedSet(KEY));
    act(() => { result.current.toggle("x"); });
    act(() => { result.current.toggle("x"); });
    expect(result.current.items.has("x")).toBe(false);
  });

  it("toggle persists the new set to localStorage", () => {
    const { result } = renderHook(() => usePersistedSet(KEY));
    act(() => { result.current.toggle("y"); });
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    expect(stored).toContain("y");
  });

  it("clear empties the set", () => {
    const { result } = renderHook(() => usePersistedSet(KEY));
    act(() => { result.current.toggle("a"); result.current.toggle("b"); });
    act(() => { result.current.clear(); });
    expect(result.current.items.size).toBe(0);
  });

  it("clear persists empty array to localStorage", () => {
    const { result } = renderHook(() => usePersistedSet(KEY));
    act(() => { result.current.toggle("a"); });
    act(() => { result.current.clear(); });
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as string[];
    expect(stored).toEqual([]);
  });

  it("two different keys do not share state", () => {
    const { result: r1 } = renderHook(() => usePersistedSet("key:one"));
    const { result: r2 } = renderHook(() => usePersistedSet("key:two"));
    act(() => { r1.current.toggle("shared"); });
    expect(r2.current.items.has("shared")).toBe(false);
  });

  it("handles corrupted localStorage value gracefully", () => {
    localStorage.setItem(KEY, "not json {{{");
    const { result } = renderHook(() => usePersistedSet(KEY));
    expect(result.current.items.size).toBe(0);
  });
});
