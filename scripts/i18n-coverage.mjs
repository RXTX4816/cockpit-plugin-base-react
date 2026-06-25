#!/usr/bin/env node
// i18n coverage checker — updates a README.md table with locale completeness.
//
// Usage:
//   node scripts/i18n-coverage.mjs [--dir <locales-dir>] [--readme <path>]
//
// Defaults:
//   --dir     src/i18n/locales
//   --readme  README.md
//
// The README must contain:
//   <!-- i18n-coverage-start -->
//   <!-- i18n-coverage-end -->

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

// When run as an installed bin, resolve paths against the consuming project's cwd.
const root = process.cwd();

// Parse CLI args
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}
const localesDir = resolve(root, getArg("--dir") ?? "src/i18n/locales");
const readmePath = resolve(root, getArg("--readme") ?? "README.md");

const LANGUAGE_NAMES = {
  en: "English",
  de: "German",
  pl: "Polish",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
};

function leafKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? leafKeys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

const files = readdirSync(localesDir).filter(f => f.endsWith(".json"));
const locales = {};
for (const file of files) {
  const code = file.replace(".json", "");
  locales[code] = JSON.parse(readFileSync(join(localesDir, file), "utf8"));
}

if (!locales.en) {
  console.error("en.json not found — aborting");
  process.exit(1);
}

const enKeys = new Set(leafKeys(locales.en));
const total = enKeys.size;

const entries = Object.entries(locales)
  .sort(([a], [b]) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)))
  .map(([code, data]) => {
    const keys = new Set(leafKeys(data));
    const covered = [...enKeys].filter(k => keys.has(k)).length;
    const pct = Math.min(100, Math.round((covered / total) * 100));
    const name = LANGUAGE_NAMES[code] ?? code;
    const label = code === "en" ? `${name} (\`${code}\`) — source` : `\`${code}\``;
    return { pct, label };
  });

const groups = new Map();
for (const e of entries) {
  const key = `${e.pct}%`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e.label);
}

const rows = [...groups.entries()]
  .sort(([a], [b]) => parseInt(b) - parseInt(a))
  .map(([pct, langs]) => `| ${pct} | ${langs.join(", ")} |`);

const table = [
  "| Coverage | Languages |",
  "|---|---|",
  ...rows,
].join("\n");

const readme = readFileSync(readmePath, "utf8");
const start = "<!-- i18n-coverage-start -->";
const end = "<!-- i18n-coverage-end -->";
const rx = new RegExp(`${start}[\\s\\S]*?${end}`);

if (!rx.test(readme)) {
  console.error("README markers not found — add <!-- i18n-coverage-start --> and <!-- i18n-coverage-end -->");
  process.exit(1);
}

const updated = readme.replace(rx, `${start}\n${table}\n${end}`);
if (updated !== readme) writeFileSync(readmePath, updated);
console.log(`i18n coverage updated (${files.length} locales, ${total} source keys)`);
