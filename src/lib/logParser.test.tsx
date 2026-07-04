import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { extractJsonPayload, colorizeJson, highlightMessage, tokenColor, tokenWeight } from "./logParser";

describe("extractJsonPayload", () => {
  it("parses a bare JSON line", () => {
    expect(extractJsonPayload('{"a":1}')).toEqual({ prefix: "", obj: { a: 1 } });
  });

  it("parses a journalctl-prefixed JSON line", () => {
    expect(extractJsonPayload('myunit[123]: {"a":1}')).toEqual({ prefix: "myunit[123]: ", obj: { a: 1 } });
  });

  it("returns null for non-JSON lines", () => {
    expect(extractJsonPayload("plain log line")).toBeNull();
  });
});

describe("colorizeJson", () => {
  it("renders strings, keys, numbers, booleans, and null correctly", () => {
    const html = renderToStaticMarkup(
      colorizeJson(JSON.stringify({ name: "hi", count: -0.314, ok: true, missing: null }, null, 2)),
    );
    expect(html).toContain("hi");
    expect(html).toContain("-0.314");
    expect(html).toContain("true");
    expect(html).toContain("null");
  });

  it("colors an exponent-notation number", () => {
    const html = renderToStaticMarkup(colorizeJson('{"count": 1.5e-10}'));
    expect(html).toContain("1.5e-10");
  });

  it("handles escaped quotes inside strings", () => {
    const html = renderToStaticMarkup(colorizeJson('{"msg": "he said \\"hi\\""}'));
    expect(html).toContain("hi");
  });

  // Regression test for #51 / CodeQL js/polynomial-redos: a string value packed with
  // quote characters, which JSON.stringify re-escapes into many adjacent `\"` pairs.
  // This is the realistic shape of attacker-controlled data (it must round-trip through
  // JSON.parse in extractJsonPayload before ever reaching colorizeJson), as opposed to a
  // raw unterminated string, which can't occur via colorizeJson's only call site.
  it("stays fast on a value packed with many escaped quotes", () => {
    const value = '"'.repeat(50000);
    const payload = JSON.stringify({ a: value });
    const start = Date.now();
    renderToStaticMarkup(colorizeJson(payload));
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("falls back to plain text above the length guard instead of colorizing", () => {
    const huge = JSON.stringify({ a: "x".repeat(30000) });
    const html = renderToStaticMarkup(<>{colorizeJson(huge)}</>);
    expect(html).toContain("x".repeat(100));
  });
});

describe("highlightMessage", () => {
  it("highlights a log level token", () => {
    const html = renderToStaticMarkup(<>{highlightMessage("ERROR something failed")}</>);
    expect(html).toContain("ERROR");
  });
});

describe("tokenColor / tokenWeight", () => {
  it("colors error-level tokens distinctly from info", () => {
    expect(tokenColor("ERROR")).not.toBe(tokenColor("INFO"));
    expect(tokenWeight("ERROR")).toBe(700);
    expect(tokenWeight("INFO")).toBe("inherit");
  });
});
