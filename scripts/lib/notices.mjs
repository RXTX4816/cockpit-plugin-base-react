// @ts-check
//
// Pure helpers for building a THIRD-PARTY-NOTICES file from an esbuild metafile.
// No filesystem or process access lives here so the logic stays unit-testable;
// scripts/third-party-notices.mjs supplies the real fs glue.

/**
 * @typedef {Object} NoticeEntry
 * @property {string} name       npm package name (e.g. "react", "@xterm/xterm")
 * @property {string} version    resolved version, or "" if unknown
 * @property {string} license    SPDX id or expression, or "UNKNOWN"
 * @property {string} licenseText  full license text (may be "")
 * @property {string} licenseFile  basename the text came from, or "" / "vendored" / "package.json"
 * @property {string} publisher  best-effort copyright holder / author, or ""
 * @property {string} url        homepage or repository URL, or ""
 */

/** Filenames that hold license text, checked case-insensitively. */
export const LICENSE_FILE_RE =
  /^(LICENSE|LICENCE|COPYING|COPYRIGHT|NOTICE)(\.(md|txt|rst))?$/i;

/**
 * Derive an npm package name from a path that contains "node_modules/".
 * Returns null for first-party / virtual paths.
 * @param {string} filePath
 * @returns {string | null}
 */
export function packageNameFromPath(filePath) {
  const marker = "node_modules/";
  const idx = filePath.lastIndexOf(marker);
  if (idx === -1) return null;
  const rest = filePath.slice(idx + marker.length);
  const parts = rest.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0].startsWith("@")) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0];
}

/**
 * Unique, sorted list of npm package names referenced by an esbuild metafile.
 * @param {{ inputs?: Record<string, unknown> }} metafile
 * @returns {string[]}
 */
export function packageNamesFromMetafile(metafile) {
  const names = new Set();
  for (const p of Object.keys(metafile?.inputs ?? {})) {
    const name = packageNameFromPath(p);
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * Normalise the many shapes of package.json "license" / "licenses".
 * @param {any} pkg
 * @returns {string}
 */
export function licenseId(pkg) {
  if (!pkg) return "UNKNOWN";
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license === "object" && pkg.license.type) {
    return String(pkg.license.type);
  }
  if (Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
    return pkg.licenses
      .map((/** @type {any} */ l) => (typeof l === "string" ? l : l?.type))
      .filter(Boolean)
      .join(" OR ");
  }
  return "UNKNOWN";
}

/**
 * Best-effort copyright holder: package.json author, else the first
 * "Copyright ..." line found in the license text.
 * @param {any} pkg
 * @param {string} licenseText
 * @returns {string}
 */
export function publisherOf(pkg, licenseText) {
  const author = pkg?.author;
  if (typeof author === "string" && author.trim()) return author.trim();
  if (author && typeof author === "object" && author.name) {
    return author.email ? `${author.name} <${author.email}>` : String(author.name);
  }
  // A real copyright line: "Copyright" close to a (c) / © / 4-digit year.
  const m = (licenseText || "").match(
    /^.*copyright\s+(?:\([cC]\)|©|\d{4})[^\n]*/im,
  );
  if (m) return m[0].replace(/^\s*[-*#/]*\s*/, "").trim();
  return "";
}

/**
 * @param {any} pkg
 * @returns {string}
 */
export function urlOf(pkg) {
  if (!pkg) return "";
  if (typeof pkg.homepage === "string") return pkg.homepage;
  const repo = pkg.repository;
  if (typeof repo === "string") return repo;
  if (repo && typeof repo === "object" && typeof repo.url === "string") {
    return repo.url.replace(/^git\+/, "").replace(/\.git$/, "");
  }
  return "";
}

/**
 * Build notice entries for a list of package names.
 *
 * All I/O is injected so this stays pure and testable:
 * @param {Object} io
 * @param {string[]} io.names
 * @param {(name: string) => (any | null)} io.readPackageJson   parsed package.json, or null if not installed
 * @param {(name: string) => string[]} io.listFiles              file basenames in the package root
 * @param {(name: string, file: string) => string} io.readFile   text of <package root>/<file>
 * @param {Record<string, { license?: string, text: string, note?: string, publisher?: string }>} [io.vendored]
 *        license text supplied out-of-band, keyed by package name (for packages
 *        whose published tarball omits the license file)
 * @param {string[]} [io.extraNames] additional names to include that are not in the
 *        metafile (e.g. bundled web fonts)
 * @returns {{ entries: NoticeEntry[], problems: string[] }}
 */
export function collectNotices({
  names,
  readPackageJson,
  listFiles,
  readFile,
  vendored = {},
  extraNames = [],
}) {
  /** @type {NoticeEntry[]} */
  const entries = [];
  /** @type {string[]} */
  const problems = [];

  const all = [...new Set([...names, ...extraNames])].sort((a, b) =>
    a.localeCompare(b),
  );

  for (const name of all) {
    const pkg = readPackageJson(name);
    const vend = vendored[name];

    if (!pkg && !vend) {
      problems.push(`${name}: not installed and no vendored license text`);
      continue;
    }

    let licenseText = "";
    let licenseFile = "";

    if (pkg) {
      const files = listFiles(name);
      const licFile = files.find((f) => LICENSE_FILE_RE.test(f));
      if (licFile) {
        licenseText = readFile(name, licFile).trim();
        licenseFile = licFile;
      }
    }

    if (!licenseText && vend) {
      licenseText = vend.text.trim();
      licenseFile = "vendored";
    }

    const license = vend?.license || licenseId(pkg) || "UNKNOWN";

    if (!licenseText) {
      problems.push(
        `${name}: license "${license}" but no LICENSE file in the package and no vendored text`,
      );
    }
    if (license === "UNKNOWN") {
      problems.push(`${name}: could not determine an SPDX license id`);
    }

    entries.push({
      name,
      version: pkg?.version ? String(pkg.version) : "",
      license,
      licenseText,
      licenseFile,
      publisher: vend?.publisher || publisherOf(pkg, licenseText),
      url: urlOf(pkg),
    });
  }

  return { entries, problems };
}

const RULE = "=".repeat(80);
const THIN = "-".repeat(80);

/**
 * Render the human-readable THIRD-PARTY-NOTICES.txt body.
 * @param {NoticeEntry[]} entries
 * @param {{ product?: string }} [opts]
 * @returns {string}
 */
export function renderNoticesText(entries, { product = "This product" } = {}) {
  const head = [
    "THIRD-PARTY SOFTWARE NOTICES",
    "",
    `${product} bundles the third-party packages listed below. Each is`,
    "provided under its own license, the full text of which follows its entry.",
    "",
    `Packages: ${entries.length}`,
    "",
  ].join("\n");

  const body = entries
    .map((e) => {
      const title = `${e.name}${e.version ? ` ${e.version}` : ""}`;
      const meta = [e.license, e.url].filter(Boolean).join("  ");
      return [
        RULE,
        title,
        meta,
        ...(e.publisher ? [e.publisher] : []),
        THIN,
        e.licenseText || "(no license text available)",
        "",
      ].join("\n");
    })
    .join("\n");

  return `${head}\n${body}${RULE}\n`;
}

/**
 * Render the machine-readable sidecar (no full license text — that lives in the
 * .txt). Consumed by packaging tooling (debian/copyright, RPM, bundled-provides).
 * @param {NoticeEntry[]} entries
 * @param {{ bundle?: string, now?: string }} [opts]
 * @returns {object}
 */
export function renderNoticesJson(entries, { bundle = "main.js", now } = {}) {
  return {
    generatedAt: now || new Date().toISOString(),
    bundle,
    packageCount: entries.length,
    licenses: [...new Set(entries.map((e) => e.license))].sort(),
    packages: entries.map((e) => ({
      name: e.name,
      version: e.version,
      license: e.license,
      licenseFile: e.licenseFile,
      publisher: e.publisher,
      url: e.url,
    })),
  };
}
