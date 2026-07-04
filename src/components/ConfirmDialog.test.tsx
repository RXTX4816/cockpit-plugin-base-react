import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { axe } from "jest-axe";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmDialog
      isOpen={true}
      title="Delete item?"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onConfirm, onClose };
}

describe("ConfirmDialog", () => {
  it("renders title and buttons when open", () => {
    setup();
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses custom cancelLabel", () => {
    setup({ cancelLabel: "Go back" });
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });

  it("disables buttons when loading", () => {
    setup({ loading: true });
    expect(screen.getByRole("button", { name: /Delete/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("shows error alert when error prop is set", () => {
    setup({ error: "Something went wrong" });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders body content", () => {
    setup({ body: <p>Are you sure you want to delete this?</p> });
    expect(screen.getByText("Are you sure you want to delete this?")).toBeInTheDocument();
  });

  it("uses the translated cancel label once i18next is initialized", async () => {
    await i18next.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: { common: { cancel: "Abbrechen" } } } },
    });
    setup();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    setup({ body: <p>Are you sure?</p> });
    // PatternFly's Modal renders via a portal to document.body, not into the render container.
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("has no accessibility violations with the error alert shown", async () => {
    setup({ error: "Something went wrong" });
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("calls onClose when Escape is pressed", () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog on open", async () => {
    setup();
    // focus-trap defers its initial focus via setTimeout(fn, 0).
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    });
  });

  it("returns focus to the trigger element on close", () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open dialog</button>
          {open && (
            <ConfirmDialog
              isOpen
              title="Delete item?"
              confirmLabel="Delete"
              onConfirm={() => {}}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }
    render(<Wrapper />);
    const trigger = screen.getByRole("button", { name: "open dialog" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });
});
