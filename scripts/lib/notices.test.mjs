import { describe, it, expect } from "vitest";
import {
  packageNameFromPath,
  packageNamesFromMetafile,
  licenseId,
  publisherOf,
  urlOf,
  collectNotices,
  renderNoticesText,
  renderNoticesJson,
} from "./notices.mjs";

describe("packageNameFromPath", () => {
  it("extracts a plain package name", () => {
    expect(packageNameFromPath("node_modules/react/cjs/react.production.min.js")).toBe("react");
  });

  it("extracts a scoped package name", () => {
    expect(packageNameFromPath("node_modules/@xterm/xterm/lib/xterm.js")).toBe("@xterm/xterm");
  });

  it("uses the last node_modules segment for nested deps", () => {
    expect(
      packageNameFromPath("node_modules/foo/node_modules/bar/index.js"),
    ).toBe("bar");
  });

  it("returns null for first-party paths", () => {
    expect(packageNameFromPath("src/index.tsx")).toBeNull();
  });

  it("returns null for an incomplete scoped path", () => {
    expect(packageNameFromPath("node_modules/@scope")).toBeNull();
  });
});

describe("packageNamesFromMetafile", () => {
  it("returns a sorted unique list", () => {
    const metafile = {
      inputs: {
        "src/index.tsx": {},
        "node_modules/react/index.js": {},
        "node_modules/react/cjs/react.production.min.js": {},
        "node_modules/@xterm/xterm/lib/xterm.js": {},
        "node_modules/ajv/dist/ajv.js": {},
      },
    };
    expect(packageNamesFromMetafile(metafile)).toEqual([
      "@xterm/xterm",
      "ajv",
      "react",
    ]);
  });

  it("tolerates a missing inputs key", () => {
    expect(packageNamesFromMetafile({})).toEqual([]);
  });
});

describe("licenseId", () => {
  it("reads a string license", () => {
    expect(licenseId({ license: "MIT" })).toBe("MIT");
  });

  it("reads the legacy object form", () => {
    expect(licenseId({ license: { type: "BSD-2-Clause" } })).toBe("BSD-2-Clause");
  });

  it("joins the legacy licenses array", () => {
    expect(licenseId({ licenses: [{ type: "MIT" }, { type: "Apache-2.0" }] })).toBe(
      "MIT OR Apache-2.0",
    );
  });

  it("falls back to UNKNOWN", () => {
    expect(licenseId({})).toBe("UNKNOWN");
    expect(licenseId(null)).toBe("UNKNOWN");
  });
});

describe("publisherOf", () => {
  it("prefers a string author", () => {
    expect(publisherOf({ author: "Jane Doe" }, "")).toBe("Jane Doe");
  });

  it("formats an object author", () => {
    expect(publisherOf({ author: { name: "Jane", email: "j@example.com" } }, "")).toBe(
      "Jane <j@example.com>",
    );
  });

  it("falls back to a Copyright line in the license text", () => {
    expect(publisherOf({}, "MIT License\n\nCopyright (c) 2019 Red Hat, Inc.\n")).toBe(
      "Copyright (c) 2019 Red Hat, Inc.",
    );
  });

  it("returns empty when nothing is available", () => {
    expect(publisherOf({}, "no notice here")).toBe("");
  });
});

describe("urlOf", () => {
  it("prefers homepage", () => {
    expect(urlOf({ homepage: "https://example.com" })).toBe("https://example.com");
  });

  it("normalises a git repository url", () => {
    expect(urlOf({ repository: { url: "git+https://github.com/x/y.git" } })).toBe(
      "https://github.com/x/y",
    );
  });
});

// ── collectNotices with injected I/O ──────────────────────────────────────────

/**
 * @param {Record<string, { pkg?: any, files?: Record<string,string> }>} tree
 */
function fakeIo(tree) {
  return {
    readPackageJson: (/** @type {string} */ name) => tree[name]?.pkg ?? null,
    listFiles: (/** @type {string} */ name) => Object.keys(tree[name]?.files ?? {}),
    readFile: (/** @type {string} */ name, /** @type {string} */ file) => {
      const t = tree[name]?.files?.[file];
      if (t === undefined) throw new Error(`no such file ${name}/${file}`);
      return t;
    },
  };
}

describe("collectNotices", () => {
  it("builds an entry with license text from a LICENSE file", () => {
    const io = fakeIo({
      react: {
        pkg: { name: "react", version: "19.2.8", license: "MIT", homepage: "https://react.dev" },
        files: { LICENSE: "MIT License\n\nCopyright (c) Meta Platforms, Inc.\n" },
      },
    });
    const { entries, problems } = collectNotices({ names: ["react"], ...io });
    expect(problems).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: "react",
      version: "19.2.8",
      license: "MIT",
      licenseFile: "LICENSE",
      url: "https://react.dev",
    });
    expect(entries[0].licenseText).toContain("Copyright (c) Meta Platforms");
  });

  it("finds COPYING and .md variants case-insensitively", () => {
    const io = fakeIo({
      pkga: { pkg: { name: "pkga", license: "ISC" }, files: { "copying.md": "ISC text" } },
    });
    const { entries } = collectNotices({ names: ["pkga"], ...io });
    expect(entries[0].licenseText).toBe("ISC text");
    expect(entries[0].licenseFile).toBe("copying.md");
  });

  it("reports a package with no license text as a problem", () => {
    const io = fakeIo({ pkgb: { pkg: { name: "pkgb", license: "MIT" }, files: {} } });
    const { problems } = collectNotices({ names: ["pkgb"], ...io });
    expect(problems.join()).toMatch(/pkgb: license "MIT" but no LICENSE file/);
  });

  it("reports an unknown license", () => {
    const io = fakeIo({ pkgc: { pkg: { name: "pkgc" }, files: { LICENSE: "text" } } });
    const { problems } = collectNotices({ names: ["pkgc"], ...io });
    expect(problems.join()).toMatch(/pkgc: could not determine an SPDX license id/);
  });

  it("reports a package that is neither installed nor vendored", () => {
    const { entries, problems } = collectNotices({ names: ["ghost"], ...fakeIo({}) });
    expect(entries).toEqual([]);
    expect(problems.join()).toMatch(/ghost: not installed and no vendored license text/);
  });

  it("uses vendored text when the package omits its license file", () => {
    const io = fakeIo({ fontpkg: { pkg: { name: "fontpkg", version: "1.0.0" }, files: {} } });
    const { entries, problems } = collectNotices({
      names: ["fontpkg"],
      ...io,
      vendored: { fontpkg: { license: "OFL-1.1", text: "SIL OFL 1.1 ..." } },
    });
    expect(problems).toEqual([]);
    expect(entries[0]).toMatchObject({ license: "OFL-1.1", licenseFile: "vendored" });
  });

  it("includes vendored-only names passed via extraNames", () => {
    const { entries } = collectNotices({
      names: [],
      extraNames: ["Some Font"],
      ...fakeIo({}),
      vendored: { "Some Font": { license: "OFL-1.1", text: "font license" } },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("Some Font");
  });

  it("sorts entries and de-dupes names", () => {
    const io = fakeIo({
      b: { pkg: { name: "b", license: "MIT" }, files: { LICENSE: "x" } },
      a: { pkg: { name: "a", license: "MIT" }, files: { LICENSE: "y" } },
    });
    const { entries } = collectNotices({ names: ["b", "a", "b"], ...io });
    expect(entries.map((e) => e.name)).toEqual(["a", "b"]);
  });
});

describe("renderNoticesText", () => {
  const entries = [
    {
      name: "react",
      version: "19.2.8",
      license: "MIT",
      licenseText: "MIT License\n\nCopyright (c) Meta",
      licenseFile: "LICENSE",
      publisher: "Meta",
      url: "https://react.dev",
    },
  ];

  it("includes a header with the package count and each license block", () => {
    const out = renderNoticesText(entries, { product: "cockpit-compose" });
    expect(out).toMatch(/THIRD-PARTY SOFTWARE NOTICES/);
    expect(out).toMatch(/Packages: 1/);
    expect(out).toMatch(/react 19\.2\.8/);
    expect(out).toMatch(/MIT {2}https:\/\/react\.dev/);
    expect(out).toContain("Copyright (c) Meta");
  });

  it("notes when license text is missing", () => {
    const out = renderNoticesText([{ ...entries[0], licenseText: "" }]);
    expect(out).toContain("(no license text available)");
  });
});

describe("renderNoticesJson", () => {
  it("summarises packages and distinct licenses without full text", () => {
    const json = renderNoticesJson(
      [
        { name: "react", version: "19.2.8", license: "MIT", licenseText: "long text", licenseFile: "LICENSE", publisher: "Meta", url: "u" },
        { name: "uri-js", version: "4.4.1", license: "BSD-2-Clause", licenseText: "long text", licenseFile: "LICENSE", publisher: "", url: "" },
      ],
      { bundle: "main.js", now: "2026-01-01T00:00:00.000Z" },
    );
    expect(json).toMatchObject({
      generatedAt: "2026-01-01T00:00:00.000Z",
      bundle: "main.js",
      packageCount: 2,
      licenses: ["BSD-2-Clause", "MIT"],
    });
    expect(json.packages[0]).not.toHaveProperty("licenseText");
  });
});
