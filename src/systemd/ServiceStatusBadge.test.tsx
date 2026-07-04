import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { ServiceStatusBadge } from "./ServiceStatusBadge";

describe("ServiceStatusBadge", () => {
  it.each([
    ["active", "Running"],
    ["inactive", "Stopped"],
    ["failed", "Failed"],
    ["not-installed", "Not installed"],
    ["unknown", "Unknown"],
  ] as const)("renders the default English label for %s", (status, label) => {
    render(<ServiceStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("lets a labels override win over the i18n default", () => {
    render(<ServiceStatusBadge status="active" labels={{ active: "Online" }} />);
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.queryByText("Running")).not.toBeInTheDocument();
  });

  it("uses translated labels once i18next is initialized", async () => {
    await i18next.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: { service: { running: "Läuft" } } } },
    });
    render(<ServiceStatusBadge status="active" />);
    expect(screen.getByText("Läuft")).toBeInTheDocument();
  });
});
