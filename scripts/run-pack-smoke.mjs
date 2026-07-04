#!/usr/bin/env node
// Packs the current source tree, installs the tarball into fixtures/pack-smoke/
// as a real npm dependency (not source, not yalc), and runs a runtime smoke
// import + tsc --noEmit against it. Catches "files"/"exports" mistakes that
// only surface post-pack: missing files, bad export paths, broken type
// resolution — none of which src/__contract__/exports.test.ts can catch since
// that runs against source.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fixtureDir = join(root, "fixtures/pack-smoke");
const tarballDest = join(root, "rxtx4816-cockpit-plugin-base-react.tgz");

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(" ")}${cwd ? ` (in ${cwd})` : ""}`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

try {
  console.log("== 1/4: npm pack ==");
  run("npm", ["pack", "--pack-destination", root], root);
  const tgz = readdirSync(root).find(f => f.endsWith(".tgz"));
  if (!tgz) throw new Error("npm pack did not produce a .tgz file");
  renameSync(join(root, tgz), tarballDest);

  console.log("== 2/4: npm install in fixture ==");
  run("npm", ["install"], fixtureDir);

  console.log("== 3/4: runtime smoke import ==");
  run("npm", ["run", "smoke"], fixtureDir);

  console.log("== 4/4: type resolution (tsc --noEmit) ==");
  run("npm", ["run", "typecheck"], fixtureDir);

  console.log("\nPack smoke test passed.");
} finally {
  console.log("== cleanup ==");
  if (existsSync(tarballDest)) rmSync(tarballDest);
  const fixtureNodeModules = join(fixtureDir, "node_modules");
  if (existsSync(fixtureNodeModules)) rmSync(fixtureNodeModules, { recursive: true, force: true });
  const fixtureLock = join(fixtureDir, "package-lock.json");
  if (existsSync(fixtureLock)) rmSync(fixtureLock);
  const smokeBundle = join(fixtureDir, "smoke.bundle.mjs");
  if (existsSync(smokeBundle)) rmSync(smokeBundle);
}
