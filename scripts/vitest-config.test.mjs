import { describe, it, expect } from "vitest";
import { createVitestConfig } from "../vitest.config.base.js";

describe("createVitestConfig coverage excludes", () => {
  it("excludes the shared test and barrel files by default", () => {
    const ex = createVitestConfig().test.coverage.exclude;
    expect(ex).toEqual(expect.arrayContaining([
      "src/test/**", "src/**/*.test.{ts,tsx}", "src/index.tsx", "src/api/index.ts", "src/api/types.ts",
    ]));
  });

  it("adds a plugin's excludes to the defaults instead of replacing them", () => {
    const ex = createVitestConfig({ coverage: { exclude: ["src/api/templates.ts"] } }).test.coverage.exclude;
    expect(ex).toContain("src/api/templates.ts");
    expect(ex).toContain("src/test/**");
  });
});
