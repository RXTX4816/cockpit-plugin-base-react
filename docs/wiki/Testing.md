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
import {
  mockProcess, mockHttpClient, mockCockpitFile, mockCockpitPermission, mockCockpitUser,
} from "@rxtx4816/cockpit-plugin-base-react/testing/helpers";
```

Stub the `cockpit` global yourself (e.g. `vi.stubGlobal("cockpit", { spawn: vi.fn(), file: vi.fn(), ... })`), then use these helpers to control what individual methods return:

#### mockProcess

Returns a mock `CockpitProcess` (the object `cockpit.spawn()` returns) resolving to given output, or rejecting with an error.

```ts
vi.spyOn(cockpit, "spawn").mockReturnValue(mockProcess("hello\nworld\n"));
```

#### mockHttpClient

Returns a mock of the Cockpit HTTP client with configurable per-path responses. Useful for testing components that call `cockpit.http().get(path)`.

```ts
const client = mockHttpClient({ "/api/status": '{"running": true}' });
```

`get`, `post`, and `request` are all `vi.fn()` instances, so you can assert call counts and arguments with standard Vitest matchers.

#### mockCockpitFile

Returns a mock `CockpitFile` (what `cockpit.file()` returns) resolving to given content, or `null` to simulate a missing file.

```ts
vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile("[Unit]\nDescription=test\n"));
vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile(null)); // missing file
```

#### mockCockpitPermission

Returns a mock `CockpitPermission` (what `cockpit.permission()` returns) with a fixed `allowed` state.

```ts
vi.spyOn(cockpit, "permission").mockReturnValue(mockCockpitPermission(true));
```

#### mockCockpitUser

Returns a mock user object (what `cockpit.user()` resolves to), with overridable fields.

```ts
vi.spyOn(cockpit, "user").mockResolvedValue(mockCockpitUser({ home: "/home/admin" }));
```

### Running unit tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

### Export contract tests

`src/__contract__/exports.test.ts` protects the public API surface (this is internal to the base repo itself, not something consumers need to set up). It holds a manifest of every JS/TS-importable subpath in `package.json`'s `"exports"` map and the specific named exports each one must keep providing, then dynamically imports each and asserts those names exist. `src/__contract__/typecheck-fixture.ts` does the type-level equivalent — it's picked up automatically by `npm run typecheck` since that already covers all of `src/**/*`.

**Adding, renaming, or removing a public export requires updating both files** — that's the point: it turns an accidental break into a loud, specific test failure instead of silent breakage a consumer discovers later. Non-module subpaths referenced by file path rather than imported (`./log-tokens.css`, `./tsconfig.base.json`) are intentionally excluded — those are covered by the pack smoke test below instead.

### Pack smoke tests

Export contract tests run against source — they can't catch packaging mistakes that only exist in the actual published artifact (a file missing from `"files"`, a broken `"exports"` path, bad type resolution once installed as a real dependency rather than linked source). `npm run test:pack` (`scripts/run-pack-smoke.mjs`) does:

1. `npm pack` the current source tree into a real `.tgz`.
2. `npm install` that tarball into `fixtures/pack-smoke/` as an actual dependency (not source, not `yalc`).
3. Bundle `fixtures/pack-smoke/smoke.tsx` with esbuild (`--loader:.css=empty`, since some components import CSS and a plain Node/`tsx` run — unlike a real consumer's bundler — doesn't handle that) and run the bundle under Node, asserting the main supported subpaths (root, `i18n`, `components`, `systemd`, `hooks/useAsyncAction`, `testing/helpers`) resolve with their expected exports present.
4. `tsc --noEmit` inside the fixture (extending `tsconfig.base.json` from the installed package, exactly like a real consumer) — `fixtures/pack-smoke/type-check-only.ts` additionally covers `./dark-theme`, which touches `window`/`document` at module load time and so can't safely run under plain Node regardless of packaging correctness.
5. Clean up the tarball, `node_modules`, lockfile, and esbuild output regardless of pass/fail.

This is why `.npmignore` doesn't work here and isn't used: **when `package.json` has a `"files"` array, npm ignores `.npmignore`/`.gitignore` for anything that array already matches** — exclusions have to be negation patterns inside `"files"` itself (e.g. `"!src/**/*.test.ts"`). Discovered because the first `npm pack --dry-run` shipped all 190+ test files and the internal visual-regression harness (screenshots included) before `"files"` was tightened.

Runs in CI via `.github/workflows/pack-smoke.yml`, path-filtered to files that affect packaging or the main export surface.

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

**2. Create `playwright.config.ts`** in your project root.

Pass one `VmDefinition` entry per VM defined in `scripts/test-vm.config.sh`. Ports are assigned sequentially from `COCKPIT_BASE`:

```ts
import { createPlaywrightConfig } from '@rxtx4816/cockpit-plugin-base-react/playwright.config.base';

export default createPlaywrightConfig('your-plugin-name', [
  { name: 'arch',   port: 9090 },
  { name: 'debian', port: 9091 },
  { name: 'fedora', port: 9092 },
]);
```

Each VM becomes a separate Playwright project. Keep the names in sync with `ALL_VMS` in your `test-vm.config.sh`.

**3. Add npm scripts** to `package.json`:

```json
"test:e2e":        "playwright test",
"test:e2e:ui":     "playwright test --ui",
"test:e2e:codegen":"playwright codegen"
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

Each VM is a Playwright project. Use `--project` to select which VM(s) to test:

```bash
# Start one or more VMs first
npm run vm start arch-podman && npm run vm wait arch-podman

# Run against a specific VM (Playwright --project flag)
npm run test:e2e -- --project=arch-podman

# Run against multiple VMs
npm run test:e2e -- --project=arch-podman --project=debian-podman

# Run against all defined VMs (all must be running)
npm run test:e2e

# Visual runner — shows every step, great for debugging
npm run test:e2e:ui

# Record a new test interactively (pass BASE_URL to target a specific VM)
BASE_URL=https://localhost:9090 npm run test:e2e:codegen
```

Check which VMs are up before running:

```bash
npm run vm status
```

### Targeting a VM by URL

Use `BASE_URL` to bypass the project list entirely and target one specific VM:

```bash
BASE_URL=https://localhost:9094 npm run test:e2e   # single VM, any port
```

This creates a single "custom" project regardless of how many VMs are defined in the config.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | *(from vm list)* | Override: target a single VM by URL |
| `VM_USER` | `test` | Login username |
| `VM_PASSWORD` | `test` | Login password |

---

## Visual Regression Testing (internal only)

This repo has its own lightweight visual regression suite for shared UI components — a spike covering `ConfirmDialog`, `ToastProvider`, `StatusBadge`, and `ServiceStatusBadge`. This is **internal to `cockpit-plugin-base-react` itself** — not exported to consumers, and unrelated to `playwright.config.base.js` (the VM/live-plugin e2e config consumers use).

### How it works

- `src/visual/fixtures.tsx` renders exactly one component state per page load, selected via `?view=<name>` (e.g. `?view=confirm-dialog`). One fixture per view avoids interference between portal-rendered components (PatternFly `Modal` renders to `document.body`, not wherever it's mounted).
- `src/visual/vite.config.ts` serves that page directly via Vite's dev server (TSX transformed on the fly — no separate build step).
- `playwright.config.visual.ts` starts that dev server as a Playwright `webServer` and points Chromium at it.
- `src/visual/visual.spec.ts` navigates to each view and calls `toHaveScreenshot()` — full-page for things that fill the viewport (dialogs, toast stacks), or a `data-testid="fixture-root"` locator for small elements like badges (a full-page screenshot dilutes the diff ratio enough that a real change to a small element can go undetected).

### Running locally — must use the pinned Playwright Docker image

Font rendering and anti-aliasing differ enough between environments — even different Linux distros — that baselines generated on a bare host will fail in CI (or vice versa). Baselines **must** be generated (and ideally verified) inside the exact Playwright Docker image CI uses, pinned in `.github/workflows/visual-regression.yml`:

```bash
docker run --rm -v "$(pwd)":/work -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  npm run test:visual:update
```

Swap `test:visual:update` for `test:visual` to just verify without regenerating. If you bump `@playwright/test`'s version, update the image tag in both the `docker run` command above and the CI workflow's `container:` block to match, then regenerate baselines through the new image.

Review regenerated baseline images in the diff before committing — don't blindly accept `--update-snapshots` output.

### A real flakiness pitfall found during the spike

Two, actually, both found by deliberately breaking a badge's color and confirming the test caught it (twice — the first attempt silently passed):

1. **Cross-environment font rendering.** Baselines generated on a bare local machine failed in CI even with no real change, because CI (`ubuntu-latest`) renders fonts slightly differently than the local host. Fixed by generating and running inside the pinned Playwright Docker image everywhere (see above), so "local" and "CI" are the same environment.
2. **Perceptual color threshold.** Playwright's default `toHaveScreenshot()` per-pixel `threshold` (0.2) uses a perceptual/luminance-based comparison (pixelmatch's YIQ algorithm). Two PatternFly pastel label colors (e.g. `green` vs `purple` background fills) can have similar luminance despite being a different hue, and the default threshold let a deliberately-wrong color pass undetected. `playwright.config.visual.ts` lowers `threshold` to `0.05` to catch hue-only changes — safe here because these fixtures are flat-color PatternFly components with no photographic content. If you add a fixture with real gradients/photos, re-evaluate this threshold.

### CI

`.github/workflows/visual-regression.yml` runs only on PRs touching `src/components/**`, `src/systemd/**`, or `src/visual/**` — not on every PR — inside the same pinned Docker image baselines are generated with. It uploads the Playwright HTML report (with diff images) as an artifact on failure. This job is **not required to merge** — a maintainer should look at the diff report and manually re-run `test:visual:update` (via Docker, per above) if the change is intentional.

### Adding more components

This is a first-wave spike (2–3 components), not full coverage. Before expanding broadly, watch this suite's stability across a few real CI runs (font rendering/anti-aliasing can differ between local and CI environments in ways a local run won't catch).
