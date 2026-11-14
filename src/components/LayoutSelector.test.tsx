import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LayoutSelector, type LayoutOption } from "./LayoutSelector";

type L = "list" | "card";
const LAYOUTS: LayoutOption<L>[] = [
  { key: "list", icon: <span>L</span>, label: "List" },
  { key: "card", icon: <span>C</span>, label: "Cards" },
];

function Harness() {
  const [layout, setLayout] = useState<L>("list");
  return (
    <>
      <LayoutSelector layout={layout} onLayoutChange={setLayout} layouts={LAYOUTS} />
      <span data-testid="current">{layout}</span>
    </>
  );
}

describe("LayoutSelector", () => {
  it("shows only the trigger while closed", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Change layout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();
  });

  it("replaces the trigger with exactly one button per layout when open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Change layout" }));

    expect(screen.queryByRole("button", { name: "Change layout" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(LAYOUTS.length);
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List" })).toHaveFocus();
  });

  it("picks a layout, closes, and brings the trigger back", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Change layout" }));
    fireEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.getByTestId("current")).toHaveTextContent("card");
    expect(screen.getByRole("button", { name: "Change layout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Change layout" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "List" }), { key: "Escape" });

    expect(screen.getByRole("button", { name: "Change layout" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();
  });

  it("closes on a click outside without changing the layout", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Change layout" }));
    fireEvent.mouseDown(document.body);

    expect(screen.getByRole("button", { name: "Change layout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();
    expect(screen.getByTestId("current")).toHaveTextContent("list");
  });
});
