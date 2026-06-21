import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useAutoRefresh } from "./useAutoRefresh";

describe("useAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { value: false, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls fn at the given interval", () => {
    const fn = vi.fn();
    renderHook(() => useAutoRefresh(fn, 1000));

    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not call fn when paused", () => {
    const fn = vi.fn();
    renderHook(() => useAutoRefresh(fn, 1000, true));

    act(() => { vi.advanceTimersByTime(3000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it("does not call fn when tab is hidden", () => {
    const fn = vi.fn();
    Object.defineProperty(document, "hidden", { value: true, configurable: true, writable: true });
    renderHook(() => useAutoRefresh(fn, 1000));

    act(() => { vi.advanceTimersByTime(3000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it("resumes polling when tab becomes visible", () => {
    const fn = vi.fn();
    Object.defineProperty(document, "hidden", { value: true, configurable: true, writable: true });
    renderHook(() => useAutoRefresh(fn, 1000));

    act(() => { vi.advanceTimersByTime(2000); });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true, writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("pauses polling when tab becomes hidden", () => {
    const fn = vi.fn();
    renderHook(() => useAutoRefresh(fn, 1000));

    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true, writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    act(() => { vi.advanceTimersByTime(3000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clears the interval on unmount", () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useAutoRefresh(fn, 1000));

    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);

    unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("picks up the latest fn ref without restarting the interval", () => {
    let callCount = 0;
    const fn1 = vi.fn(() => { callCount++; });
    const fn2 = vi.fn(() => { callCount += 10; });

    const { rerender } = renderHook(({ f }) => useAutoRefresh(f, 1000), {
      initialProps: { f: fn1 },
    });

    act(() => { vi.advanceTimersByTime(1000); });
    expect(callCount).toBe(1);

    rerender({ f: fn2 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(callCount).toBe(11);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
