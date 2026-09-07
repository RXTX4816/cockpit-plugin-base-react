import { describe, it, expect } from "vitest";
import {
  parseArgs,
  authorTag,
  breakingFooter,
  groupCommits,
  render,
} from "./release-notes.mjs";

const US = "\x1f";
const RS = "\x1e";

/** Build one `git log` record: subject, hash, name, email, body. */
const rec = (
  subject,
  hash,
  { name = "RXTX4816", email = "44304083+RXTX4816@users.noreply.github.com", body = "" } = {},
) => [subject, hash, name, email, body].join(US) + RS;

describe("parseArgs", () => {
  it("reads --flag value pairs", () => {
    expect(parseArgs(["--to", "v2.0.0", "--from", "v1.9.0"])).toEqual({
      to: "v2.0.0",
      from: "v1.9.0",
    });
  });
});

describe("authorTag", () => {
  it("extracts the handle from a numbered noreply address", () => {
    expect(authorTag("44304083+RXTX4816@users.noreply.github.com", "RXTX4816")).toBe("@RXTX4816");
  });
  it("extracts the handle from a plain or bot noreply address", () => {
    expect(authorTag("49699333+dependabot[bot]@users.noreply.github.com", "x")).toBe("@dependabot");
    expect(authorTag("octocat@users.noreply.github.com", "The Octocat")).toBe("@octocat");
  });
  it("falls back to the display name for a real address", () => {
    expect(authorTag("jane@example.com", "Jane Doe")).toBe("Jane Doe");
  });
});

describe("breakingFooter", () => {
  it("returns null when there is no footer", () => {
    expect(breakingFooter("just a normal body\n\nwith paragraphs")).toBeNull();
  });
  it("captures a single-line footer", () => {
    expect(breakingFooter("body text\n\nBREAKING CHANGE: the API is gone")).toBe("the API is gone");
  });
  it("captures a multi-line footer up to the next blank line", () => {
    const body = "intro\n\nBREAKING CHANGE: first line\nsecond line\n\nCloses #12";
    expect(breakingFooter(body)).toBe("first line second line");
  });
  it("accepts the BREAKING-CHANGE spelling", () => {
    expect(breakingFooter("BREAKING-CHANGE: hyphenated")).toBe("hyphenated");
  });
  it("ignores a mid-sentence mention of the phrase", () => {
    expect(
      breakingFooter("this commit teaches the script to detect BREAKING CHANGE: footers"),
    ).toBeNull();
  });
});

describe("groupCommits", () => {
  const log = [
    rec("feat(footer): add source-code link", "aaa1111"),
    rec("feat: brand new thing", "aaa2222", { name: "Jane Doe", email: "jane@example.com" }),
    rec("fix(api): stop double fetch", "bbb3333"),
    rec("fix: typo", "bbb4444"),
    rec("docs: update readme", "ccc5555"),
    rec("chore(deps): bump react", "ddd6666", {
      name: "dependabot[bot]",
      email: "49699333+dependabot[bot]@users.noreply.github.com",
    }),
    rec("build: switch bundler", "ddd7777"),
    rec("ci: cache node_modules", "eee8888"),
    rec("chore: tidy", "fff9999"),
    rec("chore(release): 1.2.0", "999aaaa"),
    rec("wip something", "000bbbb"),
  ].join("");

  it("buckets by conventional-commit type", () => {
    const { sections } = groupCommits(log);
    expect(sections.feat).toHaveLength(2);
    expect(sections.fix).toHaveLength(2);
    expect(sections.docs).toHaveLength(1);
    expect(sections.ci).toHaveLength(1);
    expect(sections.chore).toEqual(["- tidy (fff9999) by @RXTX4816"]);
  });

  it("routes chore(deps) and build into Build & Dependencies, without a scope prefix", () => {
    const { sections } = groupCommits(log);
    expect(sections.build).toEqual([
      "- bump react (ddd6666) by @dependabot",
      "- switch bundler (ddd7777) by @RXTX4816",
    ]);
  });

  it("keeps a scope prefix for non-build types and attributes the author", () => {
    const { sections } = groupCommits(log);
    expect(sections.feat).toContain("- **footer:** add source-code link (aaa1111) by @RXTX4816");
    expect(sections.feat).toContain("- brand new thing (aaa2222) by Jane Doe");
  });

  it("drops chore(release) version-bump commits", () => {
    const { sections } = groupCommits(log);
    expect(JSON.stringify(sections)).not.toContain("999aaaa");
  });

  it("puts unconventional subjects in Other", () => {
    const { sections } = groupCommits(log);
    expect(sections.other).toEqual(["- wip something (000bbbb) by @RXTX4816"]);
  });

  it("collects breaking changes from a ! header", () => {
    const { breaking } = groupCommits(rec("feat(x)!: drop node 20", "1111111"));
    expect(breaking).toEqual(["- **x:** drop node 20 (1111111) by @RXTX4816"]);
  });

  it("collects breaking changes from a body footer, using the footer text", () => {
    const { sections, breaking } = groupCommits(
      rec("fix(release): detect breaking changes", "2222222", {
        body: "some explanation\n\nBREAKING CHANGE: base 1.2.0 was mis-numbered; use ^2.0.0",
      }),
    );
    // still listed under its own type...
    expect(sections.fix).toEqual(["- **release:** detect breaking changes (2222222) by @RXTX4816"]);
    // ...and surfaced in Breaking changes with the footer's wording
    expect(breaking).toEqual([
      "- base 1.2.0 was mis-numbered; use ^2.0.0 (2222222) by @RXTX4816",
    ]);
  });
});

describe("render", () => {
  it("emits sections in order with a breaking block and compare link", () => {
    const { sections, breaking } = groupCommits(
      rec("feat!: big", "1111111") + rec("fix: small", "2222222"),
    );
    const md = render({
      from: "v1.0.0",
      to: "v2.0.0",
      repo: "RXTX4816/cockpit-plugin-base-react",
      sections,
      breaking,
    });
    expect(md).toMatch(/## Breaking changes[\s\S]*## Features[\s\S]*## Fixes/);
    expect(md).toContain(
      "**Full changelog**: https://github.com/RXTX4816/cockpit-plugin-base-react/compare/v1.0.0...v2.0.0",
    );
  });

  it("handles an empty range", () => {
    expect(render({ from: "", to: "HEAD", repo: "", sections: {}, breaking: [] })).toContain(
      "_No notable changes._",
    );
  });
});
