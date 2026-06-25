import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "./useLocalStorage";

beforeEach(() => { localStorage.clear(); });

describe("useLocalStorage", () => {
  it("returns the default value when key is absent", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads an existing value from localStorage on mount", () => {
    localStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("setValue updates state and persists to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    act(() => { result.current[1]("updated"); });
    expect(result.current[0]).toBe("updated");
    expect(JSON.parse(localStorage.getItem("test-key")!)).toBe("updated");
  });

  it("setValue accepts an updater function", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));
    act(() => { result.current[1](n => n + 1); });
    expect(result.current[0]).toBe(1);
  });

  it("remove resets to default and clears localStorage", () => {
    localStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    act(() => { result.current[2](); });
    expect(result.current[0]).toBe("default");
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("supports object values", () => {
    const { result } = renderHook(() => useLocalStorage<{ n: number }>("obj", { n: 0 }));
    act(() => { result.current[1]({ n: 42 }); });
    expect(result.current[0]).toEqual({ n: 42 });
    expect(JSON.parse(localStorage.getItem("obj")!)).toEqual({ n: 42 });
  });
});
