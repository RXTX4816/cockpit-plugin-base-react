import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe } from "jest-axe";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders the trigger element", () => {
    render(
      <Tooltip content="Helpful info">
        <button>hover me</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "hover me" })).toBeInTheDocument();
  });

  it("shows its content when the trigger receives keyboard focus", async () => {
    render(
      <Tooltip content="Helpful info">
        <button>hover me</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "hover me" }));
    await waitFor(() => {
      expect(screen.getByText("Helpful info")).toBeInTheDocument();
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Tooltip content="Helpful info">
        <button>hover me</button>
      </Tooltip>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
