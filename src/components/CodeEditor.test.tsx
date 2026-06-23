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
  const MockEditorView = Object.assign(
    vi.fn().mockImplementation(function() { return mockEditorInstance; }),
    {
      editable: { of: vi.fn().mockReturnValue([]) },
      updateListener: { of: vi.fn().mockReturnValue([]) },
    },
  );
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
  oneDark: ["oneDark-extension"],
}));

import { CodeEditor } from "./CodeEditor";
import { EditorState } from "@codemirror/state";

beforeEach(() => {
  MockEditorView.mockClear();
  vi.mocked(EditorState.create).mockClear();
  vi.mocked(EditorState.readOnly.of).mockClear();
  MockEditorView.editable.of.mockClear();
  MockEditorView.updateListener.of.mockClear();
  mockDispatch.mockClear();
  mockDestroy.mockClear();
  mockDocToString.mockReturnValue("");
});

afterEach(() => {
  document.documentElement.classList.remove("pf-v6-theme-dark");
});

describe("CodeEditor", () => {
  it("renders a div with the ce-editor class", () => {
    const { container } = render(<CodeEditor content="" />);
    expect(container.querySelector(".ce-editor")).toBeInTheDocument();
  });

  it("appends a custom className alongside ce-editor", () => {
    const { container } = render(<CodeEditor content="" className="my-editor" />);
    const el = container.querySelector(".ce-editor");
    expect(el).toBeInTheDocument();
    expect(el?.classList.contains("my-editor")).toBe(true);
  });

  it("creates an EditorView instance on mount", () => {
    render(<CodeEditor content="" />);
    expect(MockEditorView).toHaveBeenCalledOnce();
  });

  it("destroys the editor on unmount", () => {
    const { unmount } = render(<CodeEditor content="" />);
    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it("dispatches a change when content prop updates to a different value", async () => {
    mockDocToString.mockReturnValue("old content");
    const { rerender } = render(<CodeEditor content="old content" />);
    await act(async () => {
      rerender(<CodeEditor content="new content" />);
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("does not dispatch when content prop matches current doc", async () => {
    mockDocToString.mockReturnValue("same content");
    const { rerender } = render(<CodeEditor content="same content" />);
    mockDispatch.mockClear();
    await act(async () => {
      rerender(<CodeEditor content="same content" />);
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("applies readOnly.of(true) and editable.of(false) when readOnly prop is true", () => {
    render(<CodeEditor content="" readOnly />);
    expect(EditorState.readOnly.of).toHaveBeenCalledWith(true);
    expect(MockEditorView.editable.of).toHaveBeenCalledWith(false);
  });

  it("does not apply readOnly extensions when readOnly is false", () => {
    render(<CodeEditor content="" readOnly={false} />);
    expect(EditorState.readOnly.of).not.toHaveBeenCalled();
    expect(MockEditorView.editable.of).not.toHaveBeenCalled();
  });

  it("attaches updateListener when readOnly is false", () => {
    render(<CodeEditor content="" readOnly={false} />);
    expect(MockEditorView.updateListener.of).toHaveBeenCalled();
  });

  it("does not attach updateListener when readOnly is true", () => {
    render(<CodeEditor content="" readOnly />);
    expect(MockEditorView.updateListener.of).not.toHaveBeenCalled();
  });

  it("includes oneDark extension in dark mode", () => {
    document.documentElement.classList.add("pf-v6-theme-dark");
    render(<CodeEditor content="" />);
    const createCall = vi.mocked(EditorState.create).mock.calls[0];
    const extensions = (createCall[0] as { extensions: unknown[] }).extensions;
    expect(extensions.flat(10)).toContain("oneDark-extension");
  });

  it("does not include oneDark extension in light mode", () => {
    render(<CodeEditor content="" />);
    const createCall = vi.mocked(EditorState.create).mock.calls[0];
    const extensions = (createCall[0] as { extensions: unknown[] }).extensions;
    expect(extensions.flat(10)).not.toContain("oneDark-extension");
  });

  it("recreates the editor when dark mode class is added", async () => {
    render(<CodeEditor content="" />);
    expect(MockEditorView).toHaveBeenCalledTimes(1);
    await act(async () => {
      document.documentElement.classList.add("pf-v6-theme-dark");
    });
    expect(MockEditorView).toHaveBeenCalledTimes(2);
  });

  it("includes extra extensions passed via the extensions prop", () => {
    const myExtension = { tag: "my-extension" };
    render(<CodeEditor content="" extensions={[myExtension as never]} />);
    const createCall = vi.mocked(EditorState.create).mock.calls[0];
    const extensions = (createCall[0] as { extensions: unknown[] }).extensions;
    expect(extensions).toContain(myExtension);
  });
});

describe("CodeEditor — updateListener callback", () => {
  it("calls onChange when docChanged is true", () => {
    const onChange = vi.fn();
    render(<CodeEditor content="" onChange={onChange} />);
    const callback = MockEditorView.updateListener.of.mock.calls[0][0] as (update: unknown) => void;
    callback({ docChanged: true, state: { doc: { toString: () => "typed content" } } });
    expect(onChange).toHaveBeenCalledWith("typed content");
  });

  it("does not call onChange when docChanged is false", () => {
    const onChange = vi.fn();
    render(<CodeEditor content="" onChange={onChange} />);
    const callback = MockEditorView.updateListener.of.mock.calls[0][0] as (update: unknown) => void;
    onChange.mockClear();
    callback({ docChanged: false, state: { doc: { toString: () => "no change" } } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not crash when onChange is not provided", () => {
    render(<CodeEditor content="" />);
    const callback = MockEditorView.updateListener.of.mock.calls[0][0] as (update: unknown) => void;
    expect(() => callback({ docChanged: true, state: { doc: { toString: () => "x" } } })).not.toThrow();
  });
});
