import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Dev-only server for visual regression fixtures — never built/bundled for
// publishing, just serves src/visual/index.html + fixtures.tsx directly so
// Playwright can screenshot real rendered components without a full plugin build.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: { port: 5175, strictPort: true },
});
