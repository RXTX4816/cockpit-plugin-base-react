import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThirdPartyNoticesModal, type NoticesData } from "./ThirdPartyNoticesModal";

const notices: NoticesData = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  packageCount: 3,
  licenses: ["BSD-2-Clause", "MIT"],
  packages: [
    {
      name: "react",
      version: "19.2.8",
      license: "MIT",
      publisher: "Meta Platforms, Inc.",
      url: "https://react.dev",
      licenseText: "MIT License\n\nCopyright (c) Meta Platforms, Inc.",
    },
    {
      name: "uri-js",
      version: "4.4.1",
      license: "BSD-2-Clause",
      publisher: "Gary Court",
      url: "https://github.com/garycourt/uri-js",
      licenseText: "BSD 2-Clause License\n\nCopyright (c) Gary Court",
    },
    {
      name: "mystery",
      version: "1.0.0",
      license: "MIT",
      url: "https://example.com/mystery",
    },
  ],
};

function open(props: Partial<Parameters<typeof ThirdPartyNoticesModal>[0]> = {}) {
  return render(
    <ThirdPartyNoticesModal
      isOpen
      onClose={vi.fn()}
      notices={notices}
      productName="cockpit-compose"
      licenseName="AGPL-3.0-only"
      sourceUrl="https://github.com/RXTX4816/cockpit-compose"
      {...props}
    />,
  );
}

describe("ThirdPartyNoticesModal", () => {
  it("lists every bundled package with its version and license", () => {
    open();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("uri-js")).toBeInTheDocument();
    expect(screen.getByText("19.2.8")).toBeInTheDocument();
    // "BSD-2-Clause" shows up twice: once in the licenses-used summary, once on uri-js.
    expect(screen.getAllByText("BSD-2-Clause")).toHaveLength(2);
  });

  it("names the plugin's own license and links its source", () => {
    open();
    expect(screen.getByText(/cockpit-compose is licensed under AGPL-3.0-only/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /source code/i })).toHaveAttribute(
      "href",
      "https://github.com/RXTX4816/cockpit-compose",
    );
  });

  it("reveals the full license text when a package is expanded", () => {
    open();
    expect(screen.queryByText(/Copyright \(c\) Meta Platforms/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /react/ }));
    expect(screen.getByText(/Copyright \(c\) Meta Platforms/)).toBeInTheDocument();
  });

  it("expands only one package at a time", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /react/ }));
    fireEvent.click(screen.getByRole("button", { name: /uri-js/ }));
    expect(screen.getByText(/Copyright \(c\) Gary Court/)).toBeInTheDocument();
    expect(screen.queryByText(/Copyright \(c\) Meta Platforms/)).not.toBeInTheDocument();
  });

  it("explains a package that shipped no license text", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /mystery/ }));
    expect(screen.getByText(/No license text shipped with this package/)).toBeInTheDocument();
  });

  it("filters by name, license and publisher", () => {
    open();
    const input = screen.getByRole("textbox", { name: /filter by name/i });

    fireEvent.change(input, { target: { value: "uri" } });
    expect(screen.queryByText("react")).not.toBeInTheDocument();
    expect(screen.getByText("uri-js")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "bsd" } });
    expect(screen.getByText("uri-js")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Meta Platforms" } });
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.queryByText("uri-js")).not.toBeInTheDocument();
  });

  it("says so when nothing matches the filter", () => {
    open();
    fireEvent.change(screen.getByRole("textbox", { name: /filter by name/i }), {
      target: { value: "nothing-here" },
    });
    expect(screen.getByText(/No packages match this filter/)).toBeInTheDocument();
  });

  it("calls onClose from the footer button", () => {
    const onClose = vi.fn();
    open({ onClose });
    // The modal's own X and the footer button both read "Close"; the footer is last.
    const closeButtons = screen.getAllByRole("button", { name: /^close$/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders without a product name, license or source url", () => {
    open({ productName: undefined, licenseName: undefined, sourceUrl: undefined });
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /source code/i })).not.toBeInTheDocument();
  });
});
