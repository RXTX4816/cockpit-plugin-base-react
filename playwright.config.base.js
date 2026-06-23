import { defineConfig, devices } from '@playwright/test';

/**
 * @typedef {{ name: string; port: number }} VmDefinition
 */

/**
 * Create a Playwright config for a Cockpit plugin.
 *
 * Each entry in `vms` becomes a separate Playwright project targeting
 * `https://localhost:<port>`. Select individual VMs at run time with
 * Playwright's --project flag:
 *
 *   npx playwright test --project=debian-podman
 *   npx playwright test --project=arch-podman --project=debian-docker
 *
 * Override the target completely with BASE_URL (yields a single "custom" project):
 *
 *   BASE_URL=https://localhost:9094 npm run test:e2e
 *
 * @param {string} pluginName
 * @param {VmDefinition[]} vms
 * @param {import('@playwright/test').PlaywrightTestConfig} [overrides]
 */
export function createPlaywrightConfig(pluginName, vms, overrides = {}) {
  process.env.COCKPIT_PLUGIN = pluginName;

  const baseUrl = process.env.BASE_URL;

  const projects = baseUrl
    ? [{ name: 'custom', use: { ...devices['Desktop Chrome'], baseURL: baseUrl } }]
    : vms.map(vm => ({
        name: vm.name,
        use: { ...devices['Desktop Chrome'], baseURL: `https://localhost:${vm.port}` },
      }));

  return defineConfig({
    testDir: './e2e',
    retries: 1,
    use: {
      ignoreHTTPSErrors: true,
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects,
    ...overrides,
  });
}
