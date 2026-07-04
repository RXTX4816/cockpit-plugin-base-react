import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "i18next", "react-i18next", "@patternfly/react-core", "@patternfly/react-icons"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/testing/setup.ts", "./src/testing/a11y-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "threads",
  },
});
