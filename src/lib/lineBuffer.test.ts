import { describe, it, expect } from "vitest";
import { createLineBuffer, tailLines } from "./lineBuffer";

describe("createLineBuffer", () => {
  it("holds back a line until its newline arrives", () => {
    const b = createLineBuffer();
    expect(b.push("hel")).toEqual([]);
    expect(b.pending).toBe("hel");
    expect(b.push("lo\nwor")).toEqual(["hello"]);
    expect(b.push("ld\n")).toEqual(["world"]);
    expect(b.pending).toBe("");
  });

  it("keeps only the last version of a line redrawn with carriage returns", () => {
    expect(createLineBuffer().push("10%\r50%\r100%\ndone\n")).toEqual(["100%", "done"]);
  });

  it("drops blank lines", () => {
    expect(createLineBuffer().push("a\n\n  \nb\n")).toEqual(["a", "b"]);
  });

  it("strips ANSI only when asked, even when a sequence is split across chunks' lines", () => {
    expect(createLineBuffer().push("\u001b[32mok\u001b[0m\n")).toEqual(["\u001b[32mok\u001b[0m"]);
    expect(createLineBuffer({ stripAnsi: true }).push("\u001b[32mok\u001b[0m\n")).toEqual(["ok"]);
  });

  it("take() hands over the unfinished line and empties the buffer", () => {
    const b = createLineBuffer();
    b.push("half");
    expect(b.take()).toBe("half");
    expect(b.pending).toBe("");
  });
});

describe("tailLines", () => {
  it("keeps the last N lines", () => {
    expect(tailLines(["a", "b", "c"], 2)).toEqual(["b", "c"]);
    expect(tailLines(["a"], 2)).toEqual(["a"]);
  });
});
