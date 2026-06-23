# Testing

Two levels of testing are provided: **unit tests** (Vitest, always run in CI) and **E2E browser tests** (Playwright, run locally against a live VM).

---

## Unit Testing

### Setup

The package ships a Vitest setup file that configures jsdom and installs jest-dom matchers. Reference it from your plugin's `vitest.config.ts` (handled automatically when you extend the base config):

```ts
import { createVitestConfig } from "@rxtx4816/cockpit-plugin-base-react/vitest.config.base";
export default createVitestConfig();
```

### Test utilities

```ts
import { mockCockpit, mockHttpClient } from "@rxtx4816/cockpit-plugin-base-react/testing/helpers";
```

#### mockCockpit

Returns an in-memory mock of the `cockpit` browser global. Stubs out `cockpit.spawn`, `cockpit.file`, `cockpit.http`, and channel creation so tests never attempt real system calls.

```ts
beforeEach(() => {
  vi.stubGlobal("cockpit", mockCockpit());
});
```

Individual spawn calls can be configured to return specific output or to reject, letting you test both success and error paths.

#### mockHttpClient

Returns a mock of the Cockpit HTTP client with configurable per-path responses. Useful for testing components that call `cockpit.http().get(path)`.

```ts
const client = mockHttpClient({ "/api/status": '{"running": true}' });
```

`get`, `post`, and `request` are all `vi.fn()` instances, so you can assert call counts and arguments with standard Vitest matchers.

### Running unit tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

---

## E2E Testing (Playwright)

Browser tests that drive a real Chromium instance against a running QEMU VM. They cover login, navigation, and actual UI interactions — the things unit tests cannot reach.

**These tests do not run in CI.** They require a VM to be running locally first. See [VM Testing](VM-Testing.md) for how to start one.

### What the base library provides

**`@rxtx4816/cockpit-plugin-base-react/playwright.config.base`** exports `createPlaywrightConfig(pluginName, overrides?)`. It sets:
- `baseURL` from `BASE_URL` env var (default: `https://localhost:9090`)
- `ignoreHTTPSErrors: true` — VMs use a self-signed certificate
- `testDir: './e2e'`
- `retries: 1`, screenshot and video saved on failure
- Single Chromium project using `Desktop Chrome` device settings

**`@rxtx4816/cockpit-plugin-base-react/e2e`** exports the `pluginPage` fixture and `expect`. The fixture:
1. Navigates to `/` (the Cockpit login page)
2. Fills in credentials from `VM_USER` / `VM_PASSWORD` env vars (defaults: `test` / `test`)
3. Submits the login form and waits for the Cockpit shell to load
4. Navigates to `/cockpit/@localhost/<pluginName>/index.html`
5. Hands the authenticated `page` to your test

### Setting up in a consumer plugin

**1. Install and download Chromium** (one-time):

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

**2. Create `playwright.config.ts`** in your project root:

```ts
import { createPlaywrightConfig } from '@rxtx4816/cockpit-plugin-base-react/playwright.config.base';
export default createPlaywrightConfig('your-plugin-name');
```

**3. Add npm scripts** to `package.json`:

```json
"test:e2e":        "playwright test",
"test:e2e:ui":     "playwright test --ui",
"test:e2e:codegen":"playwright codegen https://localhost:9090"
```

**4. Add to `.gitignore`**:

```
test-results/
playwright-report/
```

### Writing tests

Put test files under `e2e/`. Import `test` and `expect` from the base package so every test gets the `pluginPage` fixture automatically:

```ts
import { test, expect } from '@rxtx4816/cockpit-plugin-base-react/e2e';

test('dashboard renders', async ({ pluginPage: page }) => {
  await expect(page.getByRole('heading', { name: 'My Plugin' })).toBeVisible();
});
```

Use `pluginPage` instead of the built-in `page` fixture — it's identical except it's already logged in and on your plugin's page.

### Adding custom fixtures

Extend the provided `test` to layer in your own fixtures:

```ts
import { test as base, expect } from '@rxtx4816/cockpit-plugin-base-react/e2e';

export const test = base.extend<{ stackName: string }>({
  stackName: async ({}, use) => {
    await use('gotify');
  },
});
export { expect };
```

Then import from your local file instead of the base package.

### Running E2E tests

```bash
# 1. Make sure a VM is running
npm run vm start debian-podman
npm run vm wait debian-podman

# 2. Run tests (headless)
npm run test:e2e

# 3. Or use the visual runner (great for debugging)
npm run test:e2e:ui

# 4. Record a new test by clicking through the UI
npm run test:e2e:codegen
```

### Targeting a different VM

Use the `BASE_URL` env var to point at any VM port:

```bash
BASE_URL=https://localhost:9094 npm run test:e2e   # debian-docker
BASE_URL=https://localhost:9096 npm run test:e2e   # fedora-podman
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `https://localhost:9090` | Cockpit URL of the target VM |
| `VM_USER` | `test` | Login username |
| `VM_PASSWORD` | `test` | Login password |
