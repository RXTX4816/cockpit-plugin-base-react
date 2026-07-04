import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { ServiceControl } from "./ServiceControl";

vi.mock("./api", () => ({
  startService: vi.fn().mockResolvedValue(undefined),
  stopService: vi.fn().mockResolvedValue(undefined),
  restartService: vi.fn().mockResolvedValue(undefined),
  reloadService: vi.fn().mockResolvedValue(undefined),
}));

describe("ServiceControl", () => {
  it("renders default English button labels with zero labels props", () => {
    render(<ServiceControl unit="nginx.service" status="active" />);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("opens a confirm dialog with default title and cancel label", () => {
    render(<ServiceControl unit="nginx.service" status="inactive" />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText("Start service?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("lets a labels override win over the i18n default", () => {
    render(<ServiceControl unit="nginx.service" status="active" labels={{ start: "Boot up" }} />);
    expect(screen.getByRole("button", { name: "Boot up" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });

  it("uses translated labels once i18next is initialized", async () => {
    await i18next.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: {
          translation: {
            service: { start: "Los geht's", confirm_start_title: "Dienst starten?" },
            common: { cancel: "Abbrechen" },
          },
        },
      },
    });
    render(<ServiceControl unit="nginx.service" status="inactive" />);
    expect(screen.getByRole("button", { name: "Los geht's" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Los geht's" }));
    expect(screen.getByText("Dienst starten?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });
});
