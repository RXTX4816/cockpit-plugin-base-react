/* global process */
import { test as base, expect } from '@playwright/test';

/**
 * Extended Playwright test with automatic Cockpit login.
 *
 * Use `pluginPage` instead of `page` — it is already authenticated and
 * navigated to the plugin's index.html before your test body runs.
 *
 * Credentials come from VM_USER / VM_PASSWORD env vars (default: test / test).
 * The plugin URL is set by createPlaywrightConfig via COCKPIT_PLUGIN env var.
 *
 * @example
 * import { test, expect } from '@rxtx4816/cockpit-plugin-base-react/e2e';
 *
 * test('dashboard renders', async ({ pluginPage: page }) => {
 *   await expect(page.getByRole('heading', { name: 'My Plugin' })).toBeVisible();
 * });
 */
export const test = base.extend({
  pluginPage: async ({ page }, use) => {
    const user = process.env.VM_USER ?? 'test';
    const password = process.env.VM_PASSWORD ?? 'test';
    const plugin = process.env.COCKPIT_PLUGIN;

    await page.goto('/');
    await page.locator('#login-user-input').fill(user);
    await page.locator('#login-password-input').fill(password);
    await page.locator('#login-button').click();
    // Wait for the login form to disappear — more reliable than matching the
    // redirect URL, which varies across Cockpit versions and configurations.
    await page.locator('#login-user-input').waitFor({ state: 'hidden' });

    if (plugin) {
      await page.goto(`/cockpit/@localhost/${plugin}/index.html`);
    }

    await use(page);
  },
});

export { expect };
