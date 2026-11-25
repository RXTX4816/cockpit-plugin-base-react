import { describe, it, expect, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBuild, runWatch } from "../esbuild.config.base.js";

function fakeEsbuild() {
  const calls = { build: [], context: [], watch: 0 };
  return {
    calls,
    build: vi.fn(async (opts) => {
      calls.build.push(opts);
      return { metafile: { inputs: {}, outputs: {} } };
    }),
    context: vi.fn(async (opts) => {
      calls.context.push(opts);
      return { watch: async () => { calls.watch++; } };
    }),
  };
}

async function withTmp(fn) {
  const dir = await mkdtemp(join(tmpdir(), "esbuild-runner-"));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

describe("runBuild", () => {
  it("builds once with a metafile and writes the notices", async () => {
    await withTmp(async (dir) => {
      const esbuild = fakeEsbuild();
      await runBuild({
        esbuild, product: "cockpit-x", assetsDir: join(dir, "assets"),
        notices: { textOut: join(dir, "N.txt"), jsonOut: join(dir, "n.json") },
      });
      expect(esbuild.calls.build).toHaveLength(1);
      expect(esbuild.calls.build[0]).toMatchObject({ entryPoints: ["src/index.tsx"], metafile: true, minify: true });
      expect(await readFile(join(dir, "N.txt"), "utf8")).toContain("cockpit-x");
    });
  });

  it("runs beforeBuild first and builds a second pass when notices are embedded", async () => {
    await withTmp(async (dir) => {
      const esbuild = fakeEsbuild();
      const order = [];
      esbuild.build.mockImplementation(async (opts) => { order.push(opts.metafile ? "pass1" : "pass2"); return { metafile: { inputs: {}, outputs: {} } }; });
      await runBuild({
        esbuild, product: "cockpit-x", assetsDir: join(dir, "assets"),
        beforeBuild: async () => { order.push("before"); },
        embedNotices: true,
        notices: { textOut: join(dir, "N.txt"), jsonOut: join(dir, "n.json"), includeText: true },
      });
      expect(order).toEqual(["before", "pass1", "pass2"]);
    });
  });
});

describe("runWatch", () => {
  it("creates an unminified watch context and starts watching", async () => {
    await withTmp(async (dir) => {
      const esbuild = fakeEsbuild();
      const beforeBuild = vi.fn();
      await runWatch({ esbuild, assetsDir: join(dir, "assets"), beforeBuild });
      expect(beforeBuild).toHaveBeenCalledOnce();
      expect(esbuild.calls.context[0]).toMatchObject({ minify: false });
      expect(esbuild.calls.watch).toBe(1);
    });
  });
});
