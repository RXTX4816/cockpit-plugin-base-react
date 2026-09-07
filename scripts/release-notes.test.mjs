import { describe, it, expect } from "vitest";
import { parseArgs, authorTag, groupCommits, render } from "./release-notes.mjs";

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

describe("groupCommits", () => {
  const L = (subject, hash, name = "RXTX4816", email = "44304083+RXTX4816@users.noreply.github.com") =>
    `${subject}|${hash}|${name}|${email}`;
  const log = [
    L("feat(footer): add source-code link", "aaa1111"),
    L("feat: brand new thing", "aaa2222", "Jane Doe", "jane@example.com"),
    L("fix(api): stop double fetch", "bbb3333"),
    L("fix: typo", "bbb4444"),
    L("docs: update readme", "ccc5555"),
    L("chore(deps): bump react", "ddd6666", "dependabot[bot]", "49699333+dependabot[bot]@users.noreply.github.com"),
    L("build: switch bundler", "ddd7777"),
    L("ci: cache node_modules", "eee8888"),
    L("chore: tidy", "fff9999"),
    L("chore(release): 1.2.0", "999aaaa"),
    L("wip something", "000bbbb"),
  ].join("\n");

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

  it("collects breaking changes from ! and BREAKING CHANGE", () => {
    const { breaking } = groupCommits(
      [
        L("feat(x)!: drop node 20", "1111111"),
        L("fix: y", "2222222"),
        L("refactor: z BREAKING CHANGE: gone", "3333333"),
      ].join("\n"),
    );
    expect(breaking).toEqual([
      "- **x:** drop node 20 (1111111) by @RXTX4816",
      "- z BREAKING CHANGE: gone (3333333) by @RXTX4816",
    ]);
  });
});

describe("render", () => {
  it("emits sections in order with a breaking block and compare link", () => {
    const { sections, breaking } = groupCommits(
      [
        "feat!: big|1111111|RXTX4816|44304083+RXTX4816@users.noreply.github.com",
        "fix: small|2222222|RXTX4816|44304083+RXTX4816@users.noreply.github.com",
      ].join("\n"),
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
