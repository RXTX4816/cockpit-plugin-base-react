import { describe, it, expect } from "vitest";
import { stripAnsi } from "./ansi";

describe("stripAnsi", () => {
  it("leaves plain text unchanged", () => {
    expect(stripAnsi("hello world")).toBe("hello world");
  });

  it("strips a basic color code", () => {
    const ESC = String.fromCharCode(27);
    expect(stripAnsi(`${ESC}[31mred${ESC}[0m`)).toBe("red");
  });

  it("strips bold codes", () => {
    const ESC = String.fromCharCode(27);
    expect(stripAnsi(`${ESC}[1mbold${ESC}[0m`)).toBe("bold");
  });

  it("strips multiple sequences in a single string", () => {
    const ESC = String.fromCharCode(27);
    const input = `${ESC}[32mgreen${ESC}[0m and ${ESC}[31mred${ESC}[0m`;
    expect(stripAnsi(input)).toBe("green and red");
  });

  it("strips compound codes like 256-color", () => {
    const ESC = String.fromCharCode(27);
    expect(stripAnsi(`${ESC}[38;5;214morange${ESC}[0m`)).toBe("orange");
  });

  it("returns an empty string unchanged", () => {
    expect(stripAnsi("")).toBe("");
  });

  it("strips a sequence that is the entire string", () => {
    const ESC = String.fromCharCode(27);
    expect(stripAnsi(`${ESC}[0m`)).toBe("");
  });
});
