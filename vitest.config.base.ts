import { defineConfig } from "vitest/config";
import type { TestUserConfig } from "vitest/config";

type TestConfig = TestUserConfig;

export function createVitestConfig(overrides: TestConfig = {}) {
  const { coverage: coverageOverrides, setupFiles: extraSetupFiles, ...rest } = overrides;

  return defineConfig({
    server: {
      // Allow Vite's dev server to serve files from symlinked file: packages
      // that live outside the consuming project's root directory.
      fs: { allow: [".."] },
    },
    resolve: {
      // Deduplicate packages that must be singletons when cockpit-plugin-base-react
      // is installed as a file: link (symlink) — without this, the linked
      // package resolves these from its own node_modules and React / i18next
      // end up with two separate instances, breaking hooks and translations.
      dedupe: ["react", "react-dom", "i18next", "react-i18next", "@patternfly/react-core", "@patternfly/react-icons"],
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: [
        "@rxtx4816/cockpit-plugin-base-react/testing",
        ...(Array.isArray(extraSetupFiles) ? extraSetupFiles : extraSetupFiles ? [extraSetupFiles] : []),
      ],
      include: ["src/**/*.test.{ts,tsx}"],
      pool: "threads",
      maxWorkers: 4,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/**/*.{ts,tsx}"],
        thresholds: {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        ...coverageOverrides,
      },
      ...rest,
    },
  });
}
