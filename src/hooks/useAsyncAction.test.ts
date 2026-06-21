import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAsyncAction } from "./useAsyncAction";

describe("useAsyncAction", () => {
  it("starts with loading=false and no error", () => {
    const { result } = renderHook(() => useAsyncAction(vi.fn().mockResolvedValue("ok")));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns the action result", async () => {
    const action = vi.fn<() => Promise<string>>().mockResolvedValue("done");
    const { result } = renderHook(() => useAsyncAction(action));
    let value: string | undefined;
    await act(async () => { value = await result.current.execute(); });
    expect(value).toBe("done");
  });

  it("sets loading true during execution and false after", async () => {
    let resolve!: (v: string) => void;
    const action = vi.fn(() => new Promise<string>(r => { resolve = r; }));
    const { result } = renderHook(() => useAsyncAction(action));

    act(() => { void result.current.execute(); });
    expect(result.current.loading).toBe(true);

    await act(async () => { resolve("ok"); });
    expect(result.current.loading).toBe(false);
  });

  it("captures error message on failure", async () => {
    const action = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => { await result.current.execute(); });
    expect(result.current.error).toBe("boom");
    expect(result.current.loading).toBe(false);
  });

  it("stringifies non-Error rejections", async () => {
    const action = vi.fn().mockRejectedValue("raw string error");
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => { await result.current.execute(); });
    expect(result.current.error).toBe("raw string error");
  });

  it("clears error via clearError", async () => {
    const action = vi.fn().mockRejectedValue(new Error("oops"));
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => { await result.current.execute(); });
    expect(result.current.error).toBe("oops");

    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });
});
