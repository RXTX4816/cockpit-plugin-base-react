#!/usr/bin/env node
// @ts-check
//
// Print Markdown release notes for a tag range, grouped by Conventional Commit
// type instead of the flat list `gh release create --generate-notes` produces.
//
// Usage:
//   node scripts/release-notes.mjs --to <tag> [--from <tag>] [--repo <owner/name>]
//
//   --to     the tag/ref being released (default: HEAD)
//   --from   the previous tag (default: `git describe --tags --abbrev=0 <to>^`)
//   --repo   owner/name, for the compare link (default: from `git remote`)
//
// Reads history via `git log`, so the checkout must be unshallow with tags
// (actions/checkout with fetch-depth: 0).

import { execFileSync } from "node:child_process";

/** @param {string[]} args */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {Record<string,string>} */
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) o[argv[i].slice(2)] = argv[++i];
  }
  return o;
}

// type -> section heading, in output order. Anything unmatched -> "Other".
const SECTIONS = [
  ["feat", "Features"],
  ["fix", "Fixes"],
  ["perf", "Performance"],
  ["revert", "Reverts"],
  ["refactor", "Refactoring"],
  ["docs", "Documentation"],
  ["test", "Tests"],
  ["build", "Build & Dependencies"],
  ["ci", "CI"],
  ["chore", "Chore"],
  ["other", "Other"],
];

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?:\s*(?<subject>.+)$/;

/**
 * GitHub handle from a commit author email/name. Squash-merged PRs carry the
 * PR author, usually with a `noreply.github.com` address.
 * @param {string} email
 * @param {string} name
 * @returns {string}
 */
export function authorTag(email, name) {
  const m = email.match(
    /^(?:\d+\+)?([A-Za-z0-9-]+)(?:\[bot\])?@users\.noreply\.github\.com$/,
  );
  if (m) return `@${m[1]}`;
  return name || "";
}

/**
 * @param {string} raw  output of `git log --format=%s|%h|%an|%ae`
 * @returns {{ sections: Record<string, string[]>, breaking: string[] }}
 */
export function groupCommits(raw) {
  /** @type {Record<string, string[]>} */
  const sections = {};
  /** @type {string[]} */
  const breaking = [];

  for (const line of raw.split("\n").filter(Boolean)) {
    const [subject, hash, name = "", email = ""] = line.split("|");
    const m = subject.match(CONVENTIONAL);
    const type = m?.groups?.type ?? "";
    const scope = m?.groups?.scope;

    // Drop release/version-bump noise.
    if (type === "chore" && /^(release|bump version|v?\d+\.\d+\.\d+)/i.test(m?.groups?.subject ?? "")) {
      continue;
    }

    let key = SECTIONS.find(([t]) => t === type)?.[0] ?? "other";
    if (type === "build" || (type === "chore" && /deps/i.test(scope ?? ""))) key = "build";

    const text = m?.groups?.subject ?? subject;
    const scopePrefix = scope && key !== "build" ? `**${scope}:** ` : "";
    const who = authorTag(email, name);
    // Squash merges already carry "(#NN)" in the subject; keep the short hash
    // only when there's no PR reference to link back to.
    const ref = /\(#\d+\)\s*$/.test(text) ? "" : ` (${hash})`;
    const entry = `- ${scopePrefix}${text}${ref}${who ? ` by ${who}` : ""}`;

    (sections[key] ??= []).push(entry);
    if (m?.groups?.bang || /BREAKING[ -]CHANGE/.test(subject)) {
      breaking.push(entry);
    }
  }

  return { sections, breaking };
}

/**
 * @param {{ from: string, to: string, repo: string, sections: Record<string,string[]>, breaking: string[] }} p
 */
export function render({ from, to, repo, sections, breaking }) {
  const out = [];
  if (breaking.length) {
    out.push("## Breaking changes", "", ...breaking, "");
  }
  for (const [key, heading] of SECTIONS) {
    if (sections[key]?.length) {
      out.push(`## ${heading}`, "", ...sections[key], "");
    }
  }
  if (out.length === 0) out.push("_No notable changes._", "");
  if (repo && from) {
    out.push(`**Full changelog**: https://github.com/${repo}/compare/${from}...${to}`);
  }
  return out.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const to = args.to || "HEAD";
  let from = args.from;
  if (!from) {
    try {
      from = git(["describe", "--tags", "--abbrev=0", `${to}^`]);
    } catch {
      from = git(["rev-list", "--max-parents=0", "HEAD"]).split("\n").pop() || "";
    }
  }
  let repo = args.repo;
  if (!repo) {
    try {
      const url = git(["remote", "get-url", "origin"]);
      repo = (url.match(/github\.com[:/]([^/]+\/[^/.]+)/) || [])[1] || "";
    } catch {
      repo = "";
    }
  }

  const range = from ? `${from}..${to}` : to;
  const raw = git(["log", range, "--no-merges", "--format=%s|%h|%an|%ae"]);
  const { sections, breaking } = groupCommits(raw);
  process.stdout.write(render({ from, to, repo, sections, breaking }) + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
