import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { ExternalLinkModal } from "./ExternalLinkModal";

describe("ExternalLinkModal", () => {
  it("renders the URL", () => {
    render(<ExternalLinkModal url="https://example.com:8080" onClose={vi.fn()} />);
    expect(screen.getByText("https://example.com:8080")).toBeInTheDocument();
  });

  it("calls onClose when cancel button clicked", () => {
    const onClose = vi.fn();
    render(<ExternalLinkModal url="https://example.com" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens the URL in a new tab and calls onClose when continue is clicked", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const onClose = vi.fn();
    render(<ExternalLinkModal url="https://example.com" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    expect(onClose).toHaveBeenCalledOnce();
    openSpy.mockRestore();
  });

  it("uses custom label overrides", () => {
    render(
      <ExternalLinkModal
        url="https://example.com"
        onClose={vi.fn()}
        labels={{ continueButton: "Open it", cancelButton: "Nope" }}
      />
    );
    expect(screen.getByRole("button", { name: "Open it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nope" })).toBeInTheDocument();
  });

  it("uses translated defaults once i18next is initialized", async () => {
    await i18next.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: {
          translation: {
            externalLinkModal: { continueButton: "Weiter" },
            common: { cancel: "Abbrechen" },
          },
        },
      },
    });
    render(<ExternalLinkModal url="https://example.com" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    render(<ExternalLinkModal url="https://example.com" onClose={vi.fn()} />);
    // PatternFly's Modal renders via a portal to document.body, not into the render container.
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<ExternalLinkModal url="https://example.com" onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus into the dialog on open", async () => {
    render(<ExternalLinkModal url="https://example.com" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    });
  });

  it("returns focus to the trigger element on close", () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open link modal</button>
          {open && <ExternalLinkModal url="https://example.com" onClose={() => setOpen(false)} />}
        </>
      );
    }
    render(<Wrapper />);
    const trigger = screen.getByRole("button", { name: "open link modal" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });
});
