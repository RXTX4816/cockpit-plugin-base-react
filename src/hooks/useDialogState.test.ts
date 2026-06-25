import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDialogState } from "./useDialogState";

type Modals = {
  delete: { id: string };
  rename: { id: string; name: string };
  create: undefined;
};

const NAMES = ["delete", "rename", "create"] as const;

describe("useDialogState", () => {
  it("starts with all dialogs closed", () => {
    const { result } = renderHook(() => useDialogState<Modals>(NAMES));
    expect(result.current.hasOpen).toBe(false);
    expect(result.current.isOpen("delete")).toBe(false);
  });

  it("open sets isOpen and stores data", () => {
    const { result } = renderHook(() => useDialogState<Modals>(NAMES));
    act(() => { result.current.open("delete", { id: "abc" }); });
    expect(result.current.isOpen("delete")).toBe(true);
    expect(result.current.getData("delete")).toEqual({ id: "abc" });
    expect(result.current.hasOpen).toBe(true);
  });

  it("open does not affect other dialogs", () => {
    const { result } = renderHook(() => useDialogState<Modals>(NAMES));
    act(() => { result.current.open("delete", { id: "abc" }); });
    expect(result.current.isOpen("rename")).toBe(false);
  });

  it("close clears the dialog", () => {
    const { result } = renderHook(() => useDialogState<Modals>(NAMES));
    act(() => { result.current.open("delete", { id: "abc" }); });
    act(() => { result.current.close("delete"); });
    expect(result.current.isOpen("delete")).toBe(false);
    expect(result.current.getData("delete")).toBeUndefined();
    expect(result.current.hasOpen).toBe(false);
  });

  it("closeAll closes every open dialog", () => {
    const { result } = renderHook(() => useDialogState<Modals>(NAMES));
    act(() => {
      result.current.open("delete", { id: "1" });
      result.current.open("rename", { id: "2", name: "x" });
    });
    act(() => { result.current.closeAll(); });
    expect(result.current.hasOpen).toBe(false);
  });

  it("transition closes from and opens to with from's data by default", () => {
    const { result } = renderHook(() => useDialogState<Modals>(NAMES));
    act(() => { result.current.open("delete", { id: "abc" }); });
    act(() => { result.current.transition("delete", "rename", { id: "abc", name: "foo" }); });
    expect(result.current.isOpen("delete")).toBe(false);
    expect(result.current.isOpen("rename")).toBe(true);
    expect(result.current.getData("rename")).toEqual({ id: "abc", name: "foo" });
  });

  it("transition with no explicit data carries from's data forward", () => {
    type T = { a: { v: number }; b: { v: number } };
    const { result } = renderHook(() => useDialogState<T>(["a", "b"]));
    act(() => { result.current.open("a", { v: 7 }); });
    act(() => { result.current.transition("a", "b"); });
    expect(result.current.getData("b")).toEqual({ v: 7 });
  });
});
