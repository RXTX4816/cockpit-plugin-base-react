import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { LogViewer } from "./LogViewer";

describe("LogViewer", () => {
  it("renders lines and the line count", () => {
    render(<LogViewer lines={["first line", "second line"]} />);
    expect(screen.getByText("first line")).toBeInTheDocument();
    expect(screen.getByText("second line")).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("shows the default empty message when there are no lines", () => {
    render(<LogViewer lines={[]} />);
    expect(screen.getByText("No log entries.")).toBeInTheDocument();
  });

  it("shows the default error title and Retry action", () => {
    render(<LogViewer lines={[]} error="boom" onRefresh={vi.fn()} />);
    expect(screen.getByText("Failed to load logs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("honors prop overrides over i18n defaults", () => {
    render(<LogViewer lines={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("uses translated strings once i18next is initialized", async () => {
    await i18next.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: {
          translation: {
            logViewer: { emptyMessage: "Keine Protokolleinträge.", linesSuffix: "Zeilen" },
          },
        },
      },
    });
    render(<LogViewer lines={[]} />);
    expect(screen.getByText("Keine Protokolleinträge.")).toBeInTheDocument();
  });
});
