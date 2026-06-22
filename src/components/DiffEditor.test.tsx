import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

const { MockEditorView, mockDispatch, mockDestroy, mockDocToString } = vi.hoisted(() => {
  const mockDocToString = vi.fn().mockReturnValue("");
  const mockDispatch = vi.fn();
  const mockDestroy = vi.fn();
  const mockEditorInstance = {
    state: { doc: { toString: mockDocToString } },
    dispatch: mockDispatch,
    destroy: mockDestroy,
  };
  const MockEditorView = vi.fn().mockImplementation(function() { return mockEditorInstance; });
  Object.assign(MockEditorView, {
    editable: { of: vi.fn().mockReturnValue([]) },
  });
  return { MockEditorView, mockDispatch, mockDestroy, mockDocToString };
});

vi.mock("codemirror", () => ({
  EditorView: MockEditorView,
  basicSetup: [],
}));

vi.mock("@codemirror/state", () => ({
  EditorState: {
    create: vi.fn().mockReturnValue({}),
    readOnly: { of: vi.fn().mockReturnValue([]) },
  },
}));

vi.mock("@codemirror/theme-one-dark", () => ({
  oneDark: [],
}));

vi.mock("@codemirror/merge", () => ({
  unifiedMergeView: vi.fn().mockReturnValue([]),
}));

import { DiffEditor } from "./DiffEditor";

beforeEach(() => {
  MockEditorView.mockClear();
  mockDispatch.mockClear();
  mockDestroy.mockClear();
  mockDocToString.mockReturnValue("");
});

afterEach(() => {
  document.documentElement.classList.remove("pf-v6-theme-dark");
});

describe("DiffEditor", () => {
  it("renders a div with the ce-editor class", () => {
    const { container } = render(<DiffEditor original="a: 1" modified="a: 2" />);
    expect(container.querySelector(".ce-editor")).toBeInTheDocument();
  });

  it("appends custom className alongside ce-editor", () => {
    const { container } = render(
      <DiffEditor original="" modified="" className="my-diff" />
    );
    const el = container.querySelector(".ce-editor");
    expect(el).toBeInTheDocument();
    expect(el?.classList.contains("my-diff")).toBe(true);
  });

  it("creates an EditorView instance on mount", () => {
    render(<DiffEditor original="" modified="" />);
    expect(MockEditorView).toHaveBeenCalledOnce();
  });

  it("destroys the editor on unmount", () => {
    const { unmount } = render(<DiffEditor original="" modified="" />);
    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it("dispatches a change when modified prop updates to a different value", async () => {
    mockDocToString.mockReturnValue("old: content");
    const { rerender } = render(<DiffEditor original="" modified="old: content" />);
    await act(async () => {
      rerender(<DiffEditor original="" modified="new: content" />);
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("does not dispatch when modified prop matches current doc", async () => {
    mockDocToString.mockReturnValue("same: content");
    const { rerender } = render(<DiffEditor original="" modified="same: content" />);
    mockDispatch.mockClear();
    await act(async () => {
      rerender(<DiffEditor original="" modified="same: content" />);
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("recreates the editor when dark mode class is added", async () => {
    render(<DiffEditor original="" modified="" />);
    expect(MockEditorView).toHaveBeenCalledTimes(1);
    await act(async () => {
      document.documentElement.classList.add("pf-v6-theme-dark");
    });
    expect(MockEditorView).toHaveBeenCalledTimes(2);
  });
});
