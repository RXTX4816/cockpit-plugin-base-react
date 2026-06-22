import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnvEditor } from "./EnvEditor";

vi.mock("./CodeEditor", () => ({
  CodeEditor: vi.fn(({ content, onChange, readOnly, extensions }: {
    content: string;
    onChange?: (v: string) => void;
    readOnly?: boolean;
    extensions?: unknown[];
  }) => (
    <textarea
      data-testid="code-editor"
      value={content}
      readOnly={readOnly}
      data-extensions={extensions?.length ?? 0}
      onChange={e => onChange?.(e.target.value)}
    />
  )),
}));

import { CodeEditor } from "./CodeEditor";
const MockCodeEditor = vi.mocked(CodeEditor);

beforeEach(() => {
  MockCodeEditor.mockClear();
});

describe("EnvEditor", () => {
  it("renders a CodeEditor", () => {
    render(<EnvEditor content="A=1" onChange={vi.fn()} />);
    expect(screen.getByTestId("code-editor")).toBeInTheDocument();
  });

  it("passes content through to the editor", () => {
    render(<EnvEditor content="KEY=value" onChange={vi.fn()} />);
    expect(screen.getByTestId("code-editor")).toHaveValue("KEY=value");
  });

  it("calls onChange when content changes", () => {
    const onChange = vi.fn();
    render(<EnvEditor content="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId("code-editor"), { target: { value: "A=1" } });
    expect(onChange).toHaveBeenCalledWith("A=1");
  });

  it("sets the editor as readOnly when prop is true", () => {
    render(<EnvEditor content="" onChange={vi.fn()} readOnly />);
    expect(screen.getByTestId("code-editor")).toHaveAttribute("readonly");
  });

  it("provides at least one extension (the env linter)", () => {
    render(<EnvEditor content="" onChange={vi.fn()} />);
    const editor = screen.getByTestId("code-editor");
    expect(Number(editor.getAttribute("data-extensions"))).toBeGreaterThanOrEqual(1);
  });
});
