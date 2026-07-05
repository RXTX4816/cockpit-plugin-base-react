# Export Audit

A classification of every public export in `package.json`'s `"exports"` map, per [#26](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/26). Grounded in actual usage data from both consumer repos (`cockpit-compose`, `cockpit-caddy`) as of this writing, not guesswork.

## Method

For every exported symbol, checked whether `cockpit-compose` and/or `cockpit-caddy` actually import it, then read the export's own source for domain-specific assumptions (does it bake in logic specific to one consumer's problem domain, regardless of who currently imports it).

## Classification

**Generic base, used by both** — hooks (`useAutoRefresh`, `useAdminMode`, `useDialogState`, `useLayout`, `usePollingFetch`), `ErrorBoundary`, `ToastProvider`/`useToast`, `LogViewer`, `Tooltip`, `LayoutSelector`, `CodeEditor`, `bootstrapPlugin`, `initCockpitI18n`, `formatArchiveTimestamp`, `createTarArchive` (confirmed both consumers import this directly — corrects an earlier open question about whether `cockpit-compose` had its own local reimplementation; it doesn't), all five shared tooling config presets (`tsconfig.base.json`, `eslint.config.base`, `vitest.config.base`, `playwright.config.base`, `esbuild.config.base`), `testing/helpers`, `./e2e`.

**Generic base, used by one consumer only (legitimate)** — this is a normal, healthy state for a shared library; not every export needs every consumer.
- `EnvEditor`/`EnvTable` — compose only (no `.env`-file concept in a reverse-proxy plugin).
- `DiffEditor`, `StatusBadge`, `useAsyncAction`, `useAsyncStream`, `useKeyboardShortcuts`, `useOperationCounter`, `usePersistedSet` — compose only.
- `ConfirmDialog`, `useConfirmAction`, `useLocalStorage`, `ExternalAddressInput`, `CollapsibleSearch`, `PluginFooter`, `systemd/*` (`ServiceControl`, `ServiceStatusBadge`, `useServiceStatus`, the `api` helpers) — caddy only (no single-systemd-service or multi-listener-address concept in compose).
- `lib/tar` — caddy only, for config backup/restore.
- `lib/envLint` — not imported directly by either consumer, but exercised indirectly through `EnvEditor` (compose).

## Findings worth a maintainer decision (resolved)

None of these rose to "misplaced app-specific code that needs to move to a consumer repo" — the original hypothesis behind #26. All three have since been resolved:

### `ExternalAddressInput`'s built-in scheme list was HTTP/reverse-proxy specific

Despite the generic name, this component's hardcoded protocol list (`http`, `https`, `h2`, `h2c`, `h3`) was specifically HTTP-family — a genuine caddy-domain assumption baked into a component that presents itself as generic "address input" infrastructure. Fixed in #84: the component now takes a `builtinSchemes` prop (default: empty), and `cockpit-caddy` passes the HTTP list explicitly (`cockpit-caddy` [#133](https://github.com/RXTX4816/cockpit-caddy/issues/133)) — the domain knowledge now lives where it belongs.

### `lib/uri.ts` was fully unused

`parseHostPort`, `isValidPort`, `buildUrl`, `portToUrl` were unimported by either consumer or base's own source. Fixed in #85: `cockpit-caddy`'s `routeUrl.ts` (from #126) already wired in `buildUrl`; `cockpit-caddy` [#134](https://github.com/RXTX4816/cockpit-caddy/issues/134) additionally replaced three duplicated `1-65535` port-range checks (`EditProxyDialog`, `AddProxyDialog`) and a regex-based port parser (`AddServerDialog`) with `isValidPort`/`parseHostPort`.

### `PluginPage` was unused by both consumers

Fixed in #86: added an optional `footer` prop (rendered as a `Page` sibling after `PageSection`, preserving sticky-footer positioning) so both consumers could adopt it without a layout change. `cockpit-caddy` [#135](https://github.com/RXTX4816/cockpit-caddy/issues/135) and `cockpit-compose` [#212](https://github.com/RXTX4816/cockpit-compose/issues/212) both migrated their root `App.tsx` to use it — `cockpit-compose` kept its own narrower `ErrorBoundary` scoped to `StacksView` nested inside `PluginPage`'s children, rather than collapsing it into `PluginPage`'s app-wide boundary.

## Non-findings (ruled out)

- `envLint.ts`'s `SENSITIVE` regex (`PASSWORD|SECRET|TOKEN|KEY|API|DSN|PRIVATE`) is a generic env-var naming convention, not Docker/Compose-specific.
- `EnvTable`'s sensitive-value detection uses the same generic regex — not container-runtime-specific.
- `useDarkMode` looked unused by both consumers in an initial pass, but is actually used internally by `CodeEditor`/`DiffEditor` (both consumers use `CodeEditor`) — not orphaned, just not imported directly.

## Not otherwise classified

`useSessionStorage` is unused by both consumers and not used internally within base either. Unlike `lib/uri.ts`, this isn't paired with an obvious intended consumer inside base's own components — noting it here for visibility, no specific recommendation beyond "keep an eye out."
