// @ts-check
import { cp, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { buildNotices } from "./scripts/third-party-notices.mjs";

/**
 * @typedef {{
 *   entryPoint?: string;
 *   outfile?: string;
 *   define?: Record<string, string>;
 *   plugins?: import("esbuild").Plugin[];
 *   metafile?: boolean;
 * }} EsbuildOptions
 */

const FILE_EXTERNALS = [
  "*.woff", "*.woff2", "*.ttf", "*.eot",
  "*.png", "*.jpg", "*.gif",
];

const ALIASES = {
  react: "react",
  "react-dom": "react-dom",
  scheduler: "scheduler",
};

/**
 * Returns a base esbuild BuildOptions object for a Cockpit plugin.
 * Bundles everything (React, PatternFly) into a single file — Cockpit plugins
 * are self-contained and do not share JS modules with the host frame.
 *
 * @param {EsbuildOptions} [options]
 * @returns {import("esbuild").BuildOptions}
 */
export function createEsbuildConfig({
  entryPoint = "src/index.tsx",
  outfile = "src/main.js",
  define = {},
  plugins = [],
  metafile = false,
} = {}) {
  return {
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    minify: true,
    metafile,
    target: "es2020",
    jsx: "automatic",
    loader: { ".tsx": "tsx", ".ts": "ts", ".svg": "dataurl" },
    external: FILE_EXTERNALS,
    alias: ALIASES,
    define,
    plugins,
  };
}

/**
 * Returns esbuild BuildOptions configured for watch / dev mode.
 * Same as {@link createEsbuildConfig} but with minification disabled.
 *
 * @param {EsbuildOptions} [options]
 * @returns {import("esbuild").BuildOptions}
 */
export function createWatchConfig(options = {}) {
  return { ...createEsbuildConfig(options), minify: false };
}

/**
 * Writes THIRD-PARTY-NOTICES.txt and third-party-notices.json for the packages
 * esbuild bundled, using the metafile from an esbuild build result. Call this
 * right after `esbuild.build(createEsbuildConfig({ metafile: true }))`.
 *
 * The .txt reproduces each bundled package's license text in full — the
 * attribution the MIT / BSD / ISC / Apache licenses require to ship with the
 * distributed artifact. Package it alongside main.js (see the plugin's
 * debian/install, %files and PKGBUILD).
 *
 * @param {object} opts
 * @param {{ inputs?: Record<string, unknown> }} opts.metafile  esbuild build result metafile
 * @param {string} [opts.textOut]   default "THIRD-PARTY-NOTICES.txt"
 * @param {string} [opts.jsonOut]   default "third-party-notices.json"
 * @param {string[]} [opts.extraNames]  extra package names to include (e.g. bundled web fonts)
 * @param {string} [opts.product]   product name for the header
 * @param {string} [opts.bundle]    bundle filename recorded in the JSON sidecar
 * @param {boolean} [opts.strict]   throw if any package is missing license text
 * @returns {Promise<{ problems: string[] }>}
 */
export async function writeThirdPartyNotices({
  metafile,
  textOut = "THIRD-PARTY-NOTICES.txt",
  jsonOut = "third-party-notices.json",
  extraNames = [],
  product = "This Cockpit plugin",
  bundle = "main.js",
  strict = false,
}) {
  const { text, json, problems } = buildNotices({ metafile, extraNames, product, bundle });
  await writeFile(textOut, text);
  await writeFile(jsonOut, JSON.stringify(json, null, 2) + "\n");
  if (problems.length) {
    const msg = `third-party notices: ${problems.length} problem(s):\n` +
      problems.map((p) => `  - ${p}`).join("\n");
    if (strict) throw new Error(msg);
    console.warn(msg);
  }
  return { problems };
}

/**
 * Copies PatternFly CSS assets (fonts, pficon) from node_modules into the
 * plugin's asset directory. Must run before the esbuild step.
 *
 * @param {string} [destDir] - Destination directory. Defaults to `"src/assets"`.
 * @returns {Promise<void>}
 */
export async function copyPatternFlyAssets(destDir = "src/assets") {
  const pfBase = join("node_modules", "@patternfly", "react-core", "dist", "styles", "assets");
  await mkdir(destDir, { recursive: true });
  await cp(join(pfBase, "fonts"), join(destDir, "fonts"), { recursive: true, force: true });
  await cp(join(pfBase, "pficon"), join(destDir, "pficon"), { recursive: true, force: true });
}
