# @rxtx4816/cockpit-plugin-base-react

Shared foundation for building [Cockpit](https://cockpit-project.org/) plugins with React and PatternFly v6. Extracts the boilerplate that every plugin needs — bootstrapping, i18n, dark theme, async patterns, systemd integration, shared tooling config, and a full QEMU VM test harness — so each plugin only contains its own logic.

## What's included

**Plugin runtime**
- `bootstrapPlugin` — mounts your React app into the Cockpit frame with i18n and error boundary wired up
- `dark-theme` — side-effect module that automatically syncs the `pf-v6-theme-dark` class with the Cockpit shell, responding to user preference changes and system theme
- `initCockpitI18n` — sets up i18next with Cockpit's locale loading conventions

**Hooks**
- `useAsyncAction` — wraps an async operation with `loading`, `error`, and `execute` state; ideal for buttons that trigger backend calls
- `useAutoRefresh` — runs a callback on a configurable interval, with manual refresh support
- `useAsyncStream` — consumes a Cockpit channel as a line-buffered async stream
- `useConfirmAction` — multi-step confirmation flow with typed state transitions
- `usePollingFetch` — fetch with automatic polling, refresh, and loading state

**Components**
- `ConfirmDialog` — confirmation modal driven by `useConfirmAction`, supports multi-step flows
- `ErrorBoundary` — catches render errors and shows a PatternFly alert with details
- `HelpPopover` — PatternFly popover for contextual help text
- `LogViewer` — scrollable terminal-style log display backed by an async stream
- `StatusBadge` — color-coded badge for service or resource states
- `ToastProvider` + hook — global toast notification system

**Systemd layer**
- `useServiceStatus` — reactive hook for a systemd service state (active, failed, inactive…)
- `ServiceControl` — start/stop/restart/enable control component
- `api` — typed wrappers around `cockpit.spawn` for systemctl operations

**Shared tooling config**
- `tsconfig.base.json` — TypeScript base config tuned for Cockpit plugins
- `eslint.config.base` — `createEslintConfig()` factory with TS, React, and react-hooks rules
- `vitest.config.base` — `createVitestConfig()` factory with jsdom and PatternFly setup
- `playwright.config.base` — `createPlaywrightConfig(pluginName)` factory for E2E tests against live VMs

**Testing utilities**
- Vitest setup file that installs jsdom and jest-dom matchers
- `mockProcess`, `mockCockpitFile`, `mockCockpitPermission`, `mockCockpitUser` — mock return values for individual `cockpit.*` methods
- `mockHttpClient` — mock for Cockpit HTTP client used in tests
- `./e2e` — `pluginPage` Playwright fixture that handles Cockpit login and navigates to your plugin automatically

**QEMU VM test harness**
- `npm run vm` — spins up real cloud VMs (Arch, Debian, Fedora) with Cockpit installed and your plugin mounted via virtfs. Used for manual and automated browser testing against a live Cockpit instance. See [VM Testing](docs/wiki/VM-Testing.md).

**Reusable CI/CD workflows**
- Lint, typecheck, test, and build on every push
- RPM, DEB, and Arch package build verification
- Semantic version bumping from conventional commits
- Automated release asset upload and AUR publishing
- GitHub Wiki sync from `docs/wiki/`

## Install

```bash
npm install @rxtx4816/cockpit-plugin-base-react
```

Peer dependencies: `react >=19`, `react-dom >=19`, `i18next >=26`, `react-i18next >=17`

## Quick start

```tsx
// src/index.tsx
import "./i18n";
import "@rxtx4816/cockpit-plugin-base-react/dark-theme";
import { bootstrapPlugin } from "@rxtx4816/cockpit-plugin-base-react/bootstrap";
import App from "./App";

bootstrapPlugin(App);
```

For full setup guidance, config sharing, and workflow integration see the [wiki](docs/wiki/Home.md).

## i18n coverage

Translation completeness for `src/i18n/locales/`, checked on every push by `scripts/i18n-coverage.mjs`.

<!-- i18n-coverage-start -->
| Coverage | Languages |
|---|---|
| 100% | English (`en`) — source, `de`, `pl` |
<!-- i18n-coverage-end -->

## Documentation

**[API Reference](https://rxtx4816.github.io/cockpit-plugin-base-react/)** — auto-generated from source, updated on every release.

- [Getting Started](docs/wiki/Getting-Started.md)
- [Hooks](docs/wiki/Hooks.md)
- [Components](docs/wiki/Components.md)
- [Systemd Layer](docs/wiki/Systemd.md)
- [Testing](docs/wiki/Testing.md)
- [Accessibility](docs/wiki/Accessibility.md)
- [VM Testing](docs/wiki/VM-Testing.md)
- [CI/CD Workflows](docs/wiki/CI-CD.md)
- [Compatibility](docs/wiki/Compatibility.md)
- [Export Audit](docs/wiki/Export-Audit.md)

## Security

Secrets must never be committed to this repository. GitHub Secret Scanning and Push Protection are active — see [SECURITY.md](SECURITY.md) for the vulnerability reporting process and the false-positive bypass flow if a push is blocked.

## License

MIT © 2026 RXTX4816
