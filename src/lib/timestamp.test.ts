import { describe, it, expect } from "vitest";
import { formatArchiveTimestamp } from "./timestamp";

describe("formatArchiveTimestamp", () => {
  it("formats a date to the expected pattern", () => {
    const d = new Date(2026, 5, 22, 14, 30, 5); // June 22 2026 14:30:05 local
    expect(formatArchiveTimestamp(d)).toBe("2026-06-22_14-30-05");
  });

  it("zero-pads single-digit month, day, hour, minute, second", () => {
    const d = new Date(2026, 0, 1, 1, 2, 3); // Jan 1 2026 01:02:03
    expect(formatArchiveTimestamp(d)).toBe("2026-01-01_01-02-03");
  });

  it("produces a filesystem-safe string (no colons or slashes)", () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    const result = formatArchiveTimestamp(d);
    expect(result).not.toMatch(/[:/\\]/);
  });

  it("output matches YYYY-MM-DD_HH-mm-ss pattern", () => {
    const d = new Date(2026, 5, 22, 14, 30, 5);
    expect(formatArchiveTimestamp(d)).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
  });
});
