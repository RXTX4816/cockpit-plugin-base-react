import { describe, it, expect } from "vitest";
import { parseHumanBytes, formatBytes } from "./bytes";

describe("parseHumanBytes", () => {
  it("parses bare bytes", () => {
    expect(parseHumanBytes("512B")).toBe(512);
  });

  it("parses kB (SI)", () => {
    expect(parseHumanBytes("1kB")).toBe(1000);
  });

  it("parses MB", () => {
    expect(parseHumanBytes("1MB")).toBe(1_000_000);
  });

  it("parses GB", () => {
    expect(parseHumanBytes("1GB")).toBe(1_000_000_000);
  });

  it("parses MiB (binary)", () => {
    expect(parseHumanBytes("1MiB")).toBe(1_048_576);
  });

  it("parses GiB", () => {
    expect(parseHumanBytes("1GiB")).toBe(1_073_741_824);
  });

  it("parses fractional values", () => {
    expect(parseHumanBytes("1.5MiB")).toBeCloseTo(1.5 * 1_048_576);
  });

  it("returns 0 for an unparseable string", () => {
    expect(parseHumanBytes("unknown")).toBe(0);
  });

  it("handles missing unit (treats as bytes)", () => {
    expect(parseHumanBytes("1024")).toBe(1024);
  });

  it("is case-insensitive for units", () => {
    expect(parseHumanBytes("1kb")).toBe(1000);
    expect(parseHumanBytes("1KB")).toBe(1000);
  });
});

describe("formatBytes", () => {
  it("formats bytes below 1024 with B suffix", () => {
    expect(formatBytes(512)).toBe("512B");
  });

  it("formats KiB range", () => {
    expect(formatBytes(2048)).toBe("2KiB");
  });

  it("formats MiB range with one decimal", () => {
    expect(formatBytes(2 * 1_048_576)).toBe("2.0MiB");
  });

  it("formats GiB range with two decimals", () => {
    expect(formatBytes(2 * 1_073_741_824)).toBe("2.00GiB");
  });

  it("formats 0 as 0B", () => {
    expect(formatBytes(0)).toBe("0B");
  });

  it("formats 1023 as 1023B", () => {
    expect(formatBytes(1023)).toBe("1023B");
  });

  it("formats 1024 as 1KiB", () => {
    expect(formatBytes(1024)).toBe("1KiB");
  });
});
