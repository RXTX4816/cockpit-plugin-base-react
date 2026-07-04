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
