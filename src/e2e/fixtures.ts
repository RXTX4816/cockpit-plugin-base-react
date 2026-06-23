import { test as base, expect, type Page } from '@playwright/test';

type CockpitFixtures = {
  pluginPage: Page;
};

/**
 * Extended test with automatic Cockpit login.
 * Use `pluginPage` instead of `page` to get a page already authenticated and
 * navigated to the plugin's index.html.
 *
 * The plugin URL is derived from the `COCKPIT_PLUGIN` env var, which must be
 * set in the consuming project's playwright.config.ts (via `process.env`).
 *
 * @example
 * import { test, expect } from '@rxtx4816/cockpit-plugin-base-react/e2e';
 */
export const test = base.extend<CockpitFixtures>({
  pluginPage: async ({ page }, use) => {
    const user = process.env.VM_USER ?? 'test';
    const password = process.env.VM_PASSWORD ?? 'test';
    const plugin = process.env.COCKPIT_PLUGIN;

    await page.goto('/');
    await page.locator('#login-user-input').fill(user);
    await page.locator('#login-password-input').fill(password);
    await page.locator('#login-button').click();
    await page.waitForURL(/\/cockpit\/@localhost\//);

    if (plugin) {
      await page.goto(`/cockpit/@localhost/${plugin}/index.html`);
    }

    await use(page);
  },
});

export { expect };
