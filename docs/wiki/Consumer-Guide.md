# Consumer Guide

A checklist and reference for maintainers of `cockpit-compose`, `cockpit-caddy`, or any future Cockpit plugin built on this package — what to import, how it's structured, and what to check when upgrading.

## Import patterns

Everything is published as raw TypeScript/TSX source (no build step) via a broad `"exports"` map in `package.json` — your own bundler compiles it as if it were local code. Two ways to import:

**Subpath imports (recommended for anything beyond a couple of hooks):**

```ts
import { ConfirmDialog, ToastProvider } from "@rxtx4816/cockpit-plugin-base-react/components";
import { ServiceControl, ServiceStatusBadge } from "@rxtx4816/cockpit-plugin-base-react/systemd";
import { useAsyncAction } from "@rxtx4816/cockpit-plugin-base-react/hooks/useAsyncAction";
```

**Root barrel import** (hooks and `initCockpitI18n`/`bootstrapPlugin` only — components and systemd exports are *not* re-exported from root):

```ts
import { useAsyncAction, useConfirmAction, bootstrapPlugin } from "@rxtx4816/cockpit-plugin-base-react";
```

Both resolve to the same source either way; it's purely about which import statement reads better at the call site. See [Components](Components.md), [Hooks](Hooks.md), and [Systemd Layer](Systemd.md) for the full list of what's under each subpath.

## Setting up i18n

See [Getting Started § i18n setup](Getting-Started.md#i18n-setup) and [§ Inheriting base component translations](Getting-Started.md#inheriting-base-component-translations) — `buildLocaleResources` removes the per-locale wrapping boilerplate, and spreading `baseTranslations` into your own resources gets you real (non-English-fallback) translations for shared component strings like `ErrorBoundary`'s default title or `ServiceControl`'s button labels.

## Using the shared tooling config

Each preset is a factory function, not a static config object — call it, optionally passing overrides:

```ts
// tsconfig.json
{ "extends": "@rxtx4816/cockpit-plugin-base-react/tsconfig.base.json" }

// eslint.config.js
import { createEslintConfig } from "@rxtx4816/cockpit-plugin-base-react/eslint.config.base";
export default createEslintConfig();

// vitest.config.ts
import { createVitestConfig } from "@rxtx4816/cockpit-plugin-base-react/vitest.config.base";
export default createVitestConfig();

// playwright.config.ts
import { createPlaywrightConfig } from "@rxtx4816/cockpit-plugin-base-react/playwright.config.base";
export default createPlaywrightConfig("your-plugin-name", [{ name: "arch", port: 9090 }]);
```

See [Testing](Testing.md) and [VM Testing](VM-Testing.md) for the full setup of each.

## Testing an unreleased base change before it's published

See [Getting Started § Testing an unreleased base change locally](Getting-Started.md#testing-an-unreleased-base-change-locally-yalc) for the `yalc`-based workflow (`npm run yalc` in base, `npm run base:add`/`base:reset` in your plugin).

## What's stable, and what to check before upgrading

Everything documented in [Components](Components.md), [Hooks](Hooks.md), and [Systemd Layer](Systemd.md) is ✅ **stable** public API — it's what's actually listed in `package.json`'s `"exports"` map, which is the real contract (see [ADR 0001](https://github.com/RXTX4816/cockpit-plugin-base-react/blob/main/docs/adr/0001-scope-of-base-package.md)). If you're importing something by reaching into a file path *not* covered by `"exports"`, you're depending on an implementation detail that can change without notice.

Before bumping your pinned `@rxtx4816/cockpit-plugin-base-react` version:

1. Check [Compatibility](Compatibility.md) for the current known-good version matrix and upgrade policy.
2. Read the new version's release notes for anything marked `BREAKING CHANGE` (generated from conventional commits).
3. Bump the pin, then run your own `npm run typecheck` and `npm run build` locally — `downstream-check.yml` (in the base repo) does this automatically against your `main` branch on every base PR, but your own feature branches aren't covered by that check.

## Reporting an issue or requesting a change

- Bugs/vulnerabilities specific to base's own code: open an issue (or a private security advisory for vulnerabilities — see [SECURITY.md](https://github.com/RXTX4816/cockpit-plugin-base-react/blob/main/SECURITY.md)) in `cockpit-plugin-base-react`, not your consumer repo.
- If you need a genuinely new shared primitive (not something specific to your plugin's domain — see [ADR 0001](https://github.com/RXTX4816/cockpit-plugin-base-react/tree/main/docs/adr) for that boundary), open an issue there describing the use case.
