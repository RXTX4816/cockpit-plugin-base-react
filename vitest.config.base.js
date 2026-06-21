import { defineConfig } from "vitest/config";

export function createVitestConfig(overrides = {}) {
  const { coverage: coverageOverrides, setupFiles: extraSetupFiles, ...rest } = overrides;

  return defineConfig({
    server: {
      fs: { allow: [".."] },
    },
    resolve: {
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
