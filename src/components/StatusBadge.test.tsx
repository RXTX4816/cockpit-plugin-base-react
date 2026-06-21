import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge, type StatusBadgeConfig } from "./StatusBadge";

const config: Record<string, StatusBadgeConfig> = {
  active: { color: "green", label: "Running" },
  inactive: { color: "grey", label: "Stopped" },
  failed: { color: "red", label: "Failed" },
};

describe("StatusBadge", () => {
  it("renders label from config", () => {
    render(<StatusBadge status="active" config={config} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders different statuses", () => {
    render(<StatusBadge status="failed" config={config} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders fallback when status is not in config", () => {
    const fallback: StatusBadgeConfig = { color: "orange", label: "Unknown" };
    render(<StatusBadge status="mystery" config={config} fallback={fallback} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders raw status string when no fallback is provided", () => {
    render(<StatusBadge status="mystery" config={config} />);
    expect(screen.getByText("mystery")).toBeInTheDocument();
  });
});
