import { defineConfig, devices } from "@playwright/test";

// Internal-only visual regression config for this repo's own shared components.
// Not exported to consumers — playwright.config.base.js (the VM/live-plugin e2e
// config) is unaffected and remains the only one they see.
export default defineConfig({
  testDir: "./src/visual",
  testMatch: "*.spec.ts",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  webServer: {
    command: "npx vite --config src/visual/vite.config.ts",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:5175",
    ...devices["Desktop Chrome"],
  },
  expect: {
    toHaveScreenshot: {
      // Playwright's default per-pixel threshold (0.2) is a perceptual/luminance
      // comparison (pixelmatch's YIQ-based algorithm) — two PatternFly pastel
      // label colors (e.g. green vs purple background fills) can have similar
      // luminance despite being a different hue, and go undetected at the
      // default threshold (caught during this spike by deliberately swapping a
      // badge color and confirming the test still passed). Lower it so hue-only
      // changes are still caught; this repo's fixtures are simple flat-color
      // PatternFly components with no photographic content, so this shouldn't
      // introduce anti-aliasing flakiness.
      threshold: 0.05,
    },
  },
  // No maxDiffPixelRatio override: that's a ratio of the whole screenshot, so on
  // a mostly-blank full-page shot a small but real color/text change can fall
  // below the threshold and pass unnoticed (also caught during this spike).
  // Prefer element-locator screenshots over full-page ones for small components.
});
