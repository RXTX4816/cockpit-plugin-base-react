import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import i18next from "i18next";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("kaboom");
  return <div>all good</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("all good")).not.toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();
  });

  it("uses fallbackTitle prop in the heading", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallbackTitle="Plugin crashed">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Plugin crashed")).toBeInTheDocument();
  });

  it("uses default title when fallbackTitle is omitted", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("uses the translated string once i18next is initialized", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await i18next.init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: { errorBoundary: { title: "Etwas ist schiefgelaufen" } } } },
    });
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Etwas ist schiefgelaufen")).toBeInTheDocument();
  });
});
