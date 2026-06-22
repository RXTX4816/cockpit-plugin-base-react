import { describe, it, expect } from "vitest";
import { parseJsonOutput } from "./parseJsonOutput";

interface Item { id: number; name: string; }

describe("parseJsonOutput", () => {
  it("returns [] for empty string", () => {
    expect(parseJsonOutput("")).toEqual([]);
  });

  it("returns [] for whitespace-only string", () => {
    expect(parseJsonOutput("   \n")).toEqual([]);
  });

  it("returns [] for the string 'null'", () => {
    expect(parseJsonOutput("null")).toEqual([]);
  });

  it("parses a JSON array", () => {
    const input = JSON.stringify([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
    expect(parseJsonOutput<Item>(input)).toEqual([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
  });

  it("wraps a single JSON object in an array", () => {
    const input = JSON.stringify({ id: 1, name: "a" });
    expect(parseJsonOutput<Item>(input)).toEqual([{ id: 1, name: "a" }]);
  });

  it("parses JSONL (one object per line)", () => {
    const input = `${JSON.stringify({ id: 1, name: "a" })}\n${JSON.stringify({ id: 2, name: "b" })}`;
    expect(parseJsonOutput<Item>(input)).toEqual([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
  });

  it("ignores blank lines in JSONL", () => {
    const input = `${JSON.stringify({ id: 1, name: "a" })}\n\n${JSON.stringify({ id: 2, name: "b" })}`;
    expect(parseJsonOutput<Item>(input)).toHaveLength(2);
  });
});
