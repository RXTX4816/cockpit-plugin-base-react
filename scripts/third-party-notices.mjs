#!/usr/bin/env node
// @ts-check
//
// Generate THIRD-PARTY-NOTICES.txt (+ a machine-readable sidecar) listing every
// npm package esbuild actually bundled into a Cockpit plugin, with each package's
// license text reproduced in full — the attribution the MIT / BSD / ISC / Apache
// licenses require to travel with the distributed artifact.
//
// Usage:
//   node scripts/third-party-notices.mjs --metafile <meta.json> [options]
//
// Options:
//   --metafile <path>   esbuild metafile JSON (build with `metafile: true`)   [required]
//   --out <path>        text notices output       (default: THIRD-PARTY-NOTICES.txt)
//   --json <path>       sidecar JSON output       (default: third-party-notices.json)
//   --modules <dir>     node_modules to resolve   (default: <cwd>/node_modules)
//   --extra <a,b,c>     extra package names to include (e.g. bundled web fonts)
//   --product <text>    product name for the header
//   --strict            exit non-zero if any package is missing license text
//
// Consumers normally call writeThirdPartyNotices() from esbuild.config.base
// instead of shelling out to this script; it exists for manual runs and CI.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  packageNamesFromMetafile,
  collectNotices,
  renderNoticesText,
  renderNoticesJson,
} from "./lib/notices.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDORED_DIR = join(HERE, "vendored-licenses");

/**
 * Load out-of-band license texts from scripts/vendored-licenses/manifest.json.
 * @returns {Record<string, { license?: string, text: string, note?: string }>}
 */
export function loadVendored(vendoredDir = VENDORED_DIR) {
  const manifestPath = join(vendoredDir, "manifest.json");
  if (!existsSync(manifestPath)) return {};
  /** @type {Record<string, { license?: string, file: string, note?: string, always?: boolean, publisher?: string }>} */
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  /** @type {Record<string, { license?: string, text: string, note?: string, always?: boolean, publisher?: string }>} */
  const out = {};
  for (const [name, spec] of Object.entries(manifest)) {
    out[name] = {
      license: spec.license,
      note: spec.note,
      always: spec.always,
      publisher: spec.publisher,
      text: readFileSync(join(vendoredDir, spec.file), "utf8"),
    };
  }
  return out;
}

/**
 * Core entry point, usable programmatically.
 * @param {Object} opts
 * @param {{ inputs?: Record<string, unknown> }} opts.metafile
 * @param {string} [opts.modulesDir]
 * @param {string[]} [opts.extraNames]
 * @param {string} [opts.product]
 * @param {string} [opts.bundle]
 * @param {Record<string, { license?: string, text: string, note?: string }>} [opts.vendored]
 * @returns {{ text: string, json: object, problems: string[] }}
 */
export function buildNotices({
  metafile,
  modulesDir = join(process.cwd(), "node_modules"),
  extraNames = [],
  product = "This product",
  bundle = "main.js",
  vendored,
}) {
  const pkgDir = (/** @type {string} */ name) => join(modulesDir, name);
  const vend = vendored ?? loadVendored();
  const alwaysNames = Object.entries(vend)
    .filter(([, v]) => /** @type {any} */ (v).always)
    .map(([k]) => k);

  const { entries, problems } = collectNotices({
    names: packageNamesFromMetafile(metafile),
    extraNames: [...extraNames, ...alwaysNames],
    vendored: vend,
    readPackageJson: (name) => {
      const p = join(pkgDir(name), "package.json");
      return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
    },
    listFiles: (name) => {
      try {
        return readdirSync(pkgDir(name));
      } catch {
        return [];
      }
    },
    readFile: (name, file) => readFileSync(join(pkgDir(name), file), "utf8"),
  });

  return {
    text: renderNoticesText(entries, { product }),
    json: renderNoticesJson(entries, { bundle }),
    problems,
  };
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const metafilePath = args.metafile;
  if (typeof metafilePath !== "string") {
    console.error("error: --metafile <path> is required");
    process.exit(2);
  }

  const outPath = resolve(String(args.out ?? "THIRD-PARTY-NOTICES.txt"));
  const jsonPath = resolve(String(args.json ?? "third-party-notices.json"));
  const modulesDir = resolve(String(args.modules ?? join(process.cwd(), "node_modules")));
  const extraNames = args.extra ? String(args.extra).split(",").map((s) => s.trim()).filter(Boolean) : [];

  const metafile = JSON.parse(readFileSync(resolve(metafilePath), "utf8"));

  const { text, json, problems } = buildNotices({
    metafile,
    modulesDir,
    extraNames,
    product: args.product ? String(args.product) : "This product",
  });

  writeFileSync(outPath, text);
  writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");

  console.log(`Wrote ${outPath} (${json.packageCount} packages)`);
  console.log(`Wrote ${jsonPath}`);

  if (problems.length) {
    console.warn(`\n${problems.length} problem(s):`);
    for (const p of problems) console.warn(`  - ${p}`);
    if (args.strict) process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
