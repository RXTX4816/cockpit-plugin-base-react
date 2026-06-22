import { describe, it, expect } from "vitest";
import { lintEnvContent } from "./envLint";

describe("lintEnvContent", () => {
  it("returns no diagnostics for valid KEY=VALUE lines", () => {
    expect(lintEnvContent("HOST=localhost\nPORT=8080")).toHaveLength(0);
  });

  it("ignores blank lines", () => {
    expect(lintEnvContent("A=1\n\nB=2")).toHaveLength(0);
  });

  it("ignores comment lines", () => {
    expect(lintEnvContent("# comment\nA=1")).toHaveLength(0);
  });

  it("reports error for a line without '='", () => {
    const diags = lintEnvContent("NOTANENTRY");
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("error");
    expect(diags[0].message).toMatch(/missing '='/i);
  });

  it("reports warning for space before '='", () => {
    const diags = lintEnvContent("KEY =value");
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toMatch(/spaces/i);
  });

  it("reports warning for space after '='", () => {
    const diags = lintEnvContent("KEY= value");
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toMatch(/spaces/i);
  });

  it("reports error for invalid key (starts with digit)", () => {
    const diags = lintEnvContent("1BAD=value");
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("error");
    expect(diags[0].message).toMatch(/invalid key/i);
  });

  it("reports error for key with hyphen", () => {
    const diags = lintEnvContent("BAD-KEY=value");
    expect(diags.some(d => d.severity === "error")).toBe(true);
  });

  it("allows underscore-prefixed keys", () => {
    expect(lintEnvContent("_VALID=1")).toHaveLength(0);
  });

  it("allows empty values", () => {
    expect(lintEnvContent("KEY=")).toHaveLength(0);
  });

  it("reports warning for duplicate keys", () => {
    const diags = lintEnvContent("HOST=a\nHOST=b");
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toMatch(/duplicate/i);
  });

  it("reports multiple diagnostics for multiple issues", () => {
    const diags = lintEnvContent("NOTANENTRY\n1BAD=x");
    expect(diags).toHaveLength(2);
  });

  it("from/to positions bracket the affected region", () => {
    const diags = lintEnvContent("NOTANENTRY");
    expect(diags[0].from).toBe(0);
    expect(diags[0].to).toBe("NOTANENTRY".length);
  });
});
