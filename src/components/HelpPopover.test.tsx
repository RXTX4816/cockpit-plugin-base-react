import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe } from "jest-axe";
import { HelpPopover } from "./HelpPopover";

describe("HelpPopover", () => {
  it("renders a trigger button labeled with the header by default", () => {
    render(<HelpPopover header="About retries" body="Explains the retry policy." />);
    expect(screen.getByRole("button", { name: "About retries" })).toBeInTheDocument();
  });

  it("uses a custom aria-label when provided", () => {
    render(<HelpPopover header="About retries" body="Explains the retry policy." aria-label="Help" />);
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("opens the popover content when the trigger is clicked (keyboard-operable via native button)", async () => {
    render(<HelpPopover header="About retries" body="Explains the retry policy." />);
    fireEvent.click(screen.getByRole("button", { name: "About retries" }));
    await waitFor(() => {
      expect(screen.getByText("Explains the retry policy.")).toBeInTheDocument();
    });
  });

  it("closes the popover when Escape is pressed", async () => {
    render(<HelpPopover header="About retries" body="Explains the retry policy." />);
    fireEvent.click(screen.getByRole("button", { name: "About retries" }));
    await waitFor(() => {
      expect(screen.getByText("Explains the retry policy.")).toBeInTheDocument();
    });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("Explains the retry policy.")).not.toBeInTheDocument();
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<HelpPopover header="About retries" body="Explains the retry policy." />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
