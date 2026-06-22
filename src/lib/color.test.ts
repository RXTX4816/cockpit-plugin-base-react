import { describe, it, expect } from "vitest";
import { hashStr, colorForKey } from "./color";

describe("hashStr", () => {
  it("returns a non-negative integer", () => {
    expect(hashStr("hello")).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for the same input", () => {
    expect(hashStr("service-a")).toBe(hashStr("service-a"));
  });

  it("returns different values for different strings", () => {
    expect(hashStr("service-a")).not.toBe(hashStr("service-b"));
  });

  it("returns 0 for empty string", () => {
    expect(hashStr("")).toBe(0);
  });

  it("result fits within a 16-bit unsigned range", () => {
    const h = hashStr("cockpit-compose");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffff);
  });
});

describe("colorForKey", () => {
  const palette = ["red", "green", "blue", "yellow"];

  it("returns 'inherit' for an empty palette", () => {
    expect(colorForKey("any", [])).toBe("inherit");
  });

  it("returns a color from the palette", () => {
    expect(palette).toContain(colorForKey("service-a", palette));
  });

  it("is deterministic for the same key", () => {
    expect(colorForKey("nginx", palette)).toBe(colorForKey("nginx", palette));
  });

  it("can return different colors for different keys", () => {
    const seen = new Set<string>();
    for (const key of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      seen.add(colorForKey(key, palette));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
