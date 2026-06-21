import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useConfirmAction } from "./useConfirmAction";

describe("useConfirmAction", () => {
  it("starts idle with no error", () => {
    const { result } = renderHook(() => useConfirmAction());
    expect(result.current.step).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("confirm() moves to confirming", () => {
    const { result } = renderHook(() => useConfirmAction());
    act(() => { result.current.confirm(); });
    expect(result.current.step).toBe("confirming");
  });

  it("cancel() resets to idle and clears error", async () => {
    const { result } = renderHook(() => useConfirmAction());
    act(() => { result.current.confirm(); });

    await act(async () => {
      await result.current.submit(vi.fn().mockRejectedValue(new Error("fail")));
    });
    expect(result.current.error).toBe("fail");

    act(() => { result.current.cancel(); });
    expect(result.current.step).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("submit() transitions: confirming → submitting → idle on success", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmAction());

    act(() => { result.current.confirm(); });
    expect(result.current.step).toBe("confirming");

    await act(async () => { await result.current.submit(action); });
    expect(result.current.step).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("submit() transitions: submitting → confirming on failure, with error set", async () => {
    const action = vi.fn().mockRejectedValue(new Error("server error"));
    const { result } = renderHook(() => useConfirmAction());

    act(() => { result.current.confirm(); });

    await act(async () => { await result.current.submit(action); });
    expect(result.current.step).toBe("confirming");
    expect(result.current.error).toBe("server error");
  });

  it("clearError() clears error without changing step", async () => {
    const action = vi.fn().mockRejectedValue(new Error("oops"));
    const { result } = renderHook(() => useConfirmAction());

    act(() => { result.current.confirm(); });
    await act(async () => { await result.current.submit(action); });
    expect(result.current.error).toBe("oops");

    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
    expect(result.current.step).toBe("confirming");
  });
});
