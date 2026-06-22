import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDarkMode } from "./useDarkMode";

afterEach(() => {
  document.documentElement.classList.remove("pf-v6-theme-dark");
});

describe("useDarkMode", () => {
  it("returns false when dark class is absent", () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);
  });

  it("returns true when dark class is already present at mount", () => {
    document.documentElement.classList.add("pf-v6-theme-dark");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);
  });

  it("updates to true when dark class is added after mount", async () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    await act(async () => {
      document.documentElement.classList.add("pf-v6-theme-dark");
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current).toBe(true);
  });

  it("updates to false when dark class is removed", async () => {
    document.documentElement.classList.add("pf-v6-theme-dark");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);

    await act(async () => {
      document.documentElement.classList.remove("pf-v6-theme-dark");
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current).toBe(false);
  });

  it("stops observing after unmount", async () => {
    const { result, unmount } = renderHook(() => useDarkMode());
    unmount();

    await act(async () => {
      document.documentElement.classList.add("pf-v6-theme-dark");
      await new Promise(r => setTimeout(r, 0));
    });

    // result is frozen at unmount time — should still be false
    expect(result.current).toBe(false);
  });
});
