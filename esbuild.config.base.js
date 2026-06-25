// @ts-check
import { cp, mkdir } from "fs/promises";
import { join } from "path";

/**
 * @typedef {{
 *   entryPoint?: string;
 *   outfile?: string;
 *   define?: Record<string, string>;
 *   plugins?: import("esbuild").Plugin[];
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
} = {}) {
  return {
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    minify: true,
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
