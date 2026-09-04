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

  it("calls fn at the given interval", async () => {
    const fn = vi.fn();
    renderHook(() => useAutoRefresh(fn, 1000));

    expect(fn).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not call fn when paused", async () => {
    const fn = vi.fn();
    renderHook(() => useAutoRefresh(fn, 1000, true));

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it("does not call fn when tab is hidden", async () => {
    const fn = vi.fn();
    Object.defineProperty(document, "hidden", { value: true, configurable: true, writable: true });
    renderHook(() => useAutoRefresh(fn, 1000));

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it("resumes polling when tab becomes visible", async () => {
    const fn = vi.fn();
    Object.defineProperty(document, "hidden", { value: true, configurable: true, writable: true });
    renderHook(() => useAutoRefresh(fn, 1000));

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true, writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("pauses polling when tab becomes hidden", async () => {
    const fn = vi.fn();
    renderHook(() => useAutoRefresh(fn, 1000));

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true, writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clears the interval on unmount", async () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useAutoRefresh(fn, 1000));

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fn).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("picks up the latest fn ref without restarting the interval", async () => {
    let callCount = 0;
    const fn1 = vi.fn(() => { callCount++; });
    const fn2 = vi.fn(() => { callCount += 10; });

    const { rerender } = renderHook(({ f }) => useAutoRefresh(f, 1000), {
      initialProps: { f: fn1 },
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(callCount).toBe(1);

    rerender({ f: fn2 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(callCount).toBe(11);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("does not overlap calls when fn is slower than the interval", async () => {
    // Regression test for #289: a fixed setInterval would fire a new call every
    // intervalMs regardless of whether the previous one had resolved, letting
    // concurrent calls pile up on slow hardware. The recursive-setTimeout
    // implementation must never have more than one call in flight.
    let inFlight = 0;
    let maxConcurrent = 0;
    let resolveCall: (() => void) | undefined;

    const fn = vi.fn(() => {
      inFlight++;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      return new Promise<void>(resolve => {
        resolveCall = () => { inFlight--; resolve(); };
      });
    });

    renderHook(() => useAutoRefresh(fn, 100));

    // First call starts at t=100 and hangs (not yet resolved).
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(inFlight).toBe(1);

    // Advance well past several would-be intervals while the call is still pending —
    // with the old setInterval behavior this would fire 5+ additional overlapping calls.
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(maxConcurrent).toBe(1);

    // Resolve the first call now, ~500ms after it started (t=100 -> t=600). elapsed=500 against
    // a 25% target duty cycle means the "ideal" next delay (500/0.25=2000ms) exceeds the 8x cap
    // (800ms), so the capped value is what actually gets scheduled.
    await act(async () => { resolveCall?.(); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(maxConcurrent).toBe(1);
  });

  it("backs off after a slow call and returns to normal cadence after a fast one", async () => {
    // First call takes ~400ms (well over the 100ms interval); second call resolves instantly.
    let callCount = 0;
    let resolveSlowCall: (() => void) | undefined;
    const fn = vi.fn(() => {
      callCount++;
      if (callCount === 1) return new Promise<void>(resolve => { resolveSlowCall = resolve; });
      return undefined;
    });

    renderHook(() => useAutoRefresh(fn, 100));

    // Call #1 fires at t=100 and hangs.
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(fn).toHaveBeenCalledTimes(1);

    // It's still slow 400ms later; resolve it now (elapsed ~400ms).
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    await act(async () => { resolveSlowCall?.(); await Promise.resolve(); });

    // Ideal next delay would be 400/0.25=1600ms, but that's capped at 100*8=800ms.
    await act(async () => { await vi.advanceTimersByTimeAsync(799); });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fn).toHaveBeenCalledTimes(2);

    // Call #2 resolves instantly, so cadence should return to the base 100ms.
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("backs off a call that finishes within its interval but eats too much of it", async () => {
    // Regression test for #289 (part 2): a call that technically finishes "on time" but
    // consistently eats a large share of its own interval (e.g. 300ms of a 500ms interval,
    // seen with the podman/docker list command on constrained hardware) still pegs the CPU
    // if it fires at full cadence forever. It must be backed off too, not just outright misses.
    let callCount = 0;
    let resolveSlowCall: (() => void) | undefined;
    const fn = vi.fn(() => {
      callCount++;
      if (callCount === 1) return new Promise<void>(resolve => { resolveSlowCall = resolve; });
      return undefined;
    });

    renderHook(() => useAutoRefresh(fn, 1000));

    // Call #1 fires at t=1000 and takes 400ms — well within the 1000ms interval (40% duty
    // cycle), so the old "did it overrun" check would never have triggered backoff here.
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    await act(async () => { resolveSlowCall?.(); await Promise.resolve(); });

    // 40% duty cycle exceeds the 10% target, so the next call is delayed to 400/0.1=4000ms,
    // not the base 1000ms.
    await act(async () => { await vi.advanceTimersByTimeAsync(3999); });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("caps the backoff so one very slow call can't stall polling indefinitely", async () => {
    let resolveCall: (() => void) | undefined;
    const fn = vi.fn(() => new Promise<void>(resolve => { resolveCall = resolve; }));

    renderHook(() => useAutoRefresh(fn, 100));

    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(fn).toHaveBeenCalledTimes(1);

    // Let it hang far longer than the 8x (800ms) cap before resolving.
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    await act(async () => { resolveCall?.(); await Promise.resolve(); });

    // Next call should fire at the 800ms cap, not after the full ~5000ms elapsed.
    await act(async () => { await vi.advanceTimersByTimeAsync(799); });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
