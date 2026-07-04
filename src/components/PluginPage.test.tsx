import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { axe } from "jest-axe";
import { PluginPage } from "./PluginPage";

function Bomb(): never {
  throw new Error("kaboom");
}

describe("PluginPage", () => {
  it("renders children", () => {
    render(<PluginPage><p>content</p></PluginPage>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <PluginPage>
        <h1>My Plugin</h1>
        <p>content</p>
      </PluginPage>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("catches render errors via its built-in ErrorBoundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <PluginPage fallbackTitle="Plugin crashed">
        <Bomb />
      </PluginPage>,
    );
    expect(screen.getByText("Plugin crashed")).toBeInTheDocument();
  });
});
