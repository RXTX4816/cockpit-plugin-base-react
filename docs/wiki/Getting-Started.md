# Getting Started

## Installation

```bash
npm install @rxtx4816/cockpit-plugin-base-react
```

Peer dependencies required in your plugin:

```bash
npm install react react-dom i18next react-i18next
```

---

## Bootstrapping your plugin

Every Cockpit plugin needs an entry point that initialises i18n, the dark theme, and mounts React. This package handles all of it:

```tsx
// src/index.tsx
import "./i18n";
import "@rxtx4816/cockpit-plugin-base-react/dark-theme";
import { bootstrapPlugin } from "@rxtx4816/cockpit-plugin-base-react/bootstrap";
import App from "./App";

bootstrapPlugin(App);
```

`bootstrapPlugin` wraps your app in an `ErrorBoundary` and a `ToastProvider`, then mounts it into the `#app` element that Cockpit expects.

---

## i18n setup

Create `src/i18n/index.ts` in your plugin:

```ts
import { initCockpitI18n, buildLocaleResources } from "@rxtx4816/cockpit-plugin-base-react/i18n";
import en from "./locales/en.json";
import de from "./locales/de.json";

initCockpitI18n(buildLocaleResources({ en, de }));

export { i18n } from "@rxtx4816/cockpit-plugin-base-react/i18n";
```

`buildLocaleResources` wraps each locale's plain translation object in the `{ translation: ... }` shape `initCockpitI18n` expects, so you don't have to hand-wrap every locale yourself. This sets up i18next with Cockpit's locale loading conventions so `useTranslation()` works throughout your plugin.

### Inheriting base component translations

Shared components (`ErrorBoundary`, `LogViewer`, `ExternalLinkModal`, `ConfirmDialog`, ...) render sensible English text out of the box even if you do nothing further. To get real translations for those strings in your other locales, spread `baseTranslations` into your own resources:

```ts
import { initCockpitI18n, buildLocaleResources, baseTranslations } from "@rxtx4816/cockpit-plugin-base-react/i18n";
import en from "./locales/en.json";
import de from "./locales/de.json";

initCockpitI18n(
  buildLocaleResources({
    en: { ...baseTranslations.en, ...en },
    de: { ...baseTranslations.de, ...de },
  }),
);

export { i18n } from "@rxtx4816/cockpit-plugin-base-react/i18n";
```

Your own keys always win on collision — put them last in the spread. Locales `baseTranslations` doesn't cover simply fall back to the English base strings via i18next's `fallbackLng`.

---

## Shared tooling config

Extend from the base configs so all plugins stay consistent.

**tsconfig.json**
```json
{
  "extends": "@rxtx4816/cockpit-plugin-base-react/tsconfig.base.json",
  "compilerOptions": {
    "paths": {}
  }
}
```

**eslint.config.js**
```js
import { createEslintConfig } from "@rxtx4816/cockpit-plugin-base-react/eslint.config.base";

export default createEslintConfig();
```

Pass extra globals if your plugin uses custom Cockpit types:
```js
export default createEslintConfig({ CockpitHttpClient: "readonly" });
```

**vitest.config.ts**
```ts
import { defineConfig } from "@rxtx4816/cockpit-plugin-base-react/vitest.config.base";

export default defineConfig();
```

---

## Dark theme

Importing the `dark-theme` side-effect module is all that's needed. It listens for three signals and keeps the `pf-v6-theme-dark` class on `<html>` in sync:

- `localStorage` key `shell:style` (values: `"light"`, `"dark"`, `"auto"`)
- The custom `cockpit-style` event dispatched by the Cockpit shell switcher
- The OS-level `prefers-color-scheme` media query

No configuration required.

---

## Testing an unreleased base change locally (`yalc`)

Before a base change is published, link it into a consumer plugin locally with [`yalc`](https://github.com/wclr/yalc) instead of waiting for a release:

```bash
# In cockpit-plugin-base-react:
npm run yalc          # runs `yalc push` — publishes the local build to yalc's store
                       # and pushes updates to every project that has it linked

# In the consumer plugin (cockpit-compose / cockpit-caddy), one-time setup:
npm run base:add      # runs `yalc add @rxtx4816/cockpit-plugin-base-react && npm install`
```

Both consumer repos already have `base:add` and `base:reset` npm scripts wired up for this. After `base:add`, the consumer's `node_modules/@rxtx4816/cockpit-plugin-base-react` points at your local base checkout — run the consumer's own tests/typecheck/build against it as usual. When you're done:

```bash
npm run base:reset     # runs `yalc retreat --all && npm install` — restores the
                        # consumer's real published dependency
```

Every time you change base source, re-run `npm run yalc` in base to push the update to any linked consumers.

**Note:** since base ships raw TypeScript source (no build step), `yalc add` links the source directly — no separate "build the package" step is needed before pushing.
