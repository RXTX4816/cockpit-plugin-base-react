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

## Findings worth a maintainer decision

None of these rise to "misplaced app-specific code that needs to move to a consumer repo" — the original hypothesis behind #26. But three are worth flagging, since they're a different kind of issue than what #26 set out to find:

### `ExternalAddressInput`'s built-in scheme list is HTTP/reverse-proxy specific

```ts
const BUILTIN_SCHEMES = ["http", "https", "h2", "h2c", "h3"];
```

Despite the generic name, this component's hardcoded protocol list is specifically HTTP-family (h2/h2c/h3 are HTTP/2 and HTTP/3 variants) — a genuine caddy-domain assumption baked into a component that presents itself as generic "address input" infrastructure. The `suggestedSchemes` prop is additive only; there's no way to override or omit the built-in list. Since only `cockpit-caddy` uses this component today, the leakage is currently harmless, but it does mean the component isn't actually generic in the way its name and location suggest. Tracked in [#84](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/84). Not urgent with only one consumer.

### `lib/uri.ts` is fully unused

`parseHostPort`, `isValidPort`, `buildUrl`, `portToUrl` — none of these four exports are imported by either consumer, or anywhere within base's own source (including `ExternalAddressInput`, which manages host/port state via plain props rather than these utilities). This is different from the "used by one consumer" pattern above — it's used by **zero** consumers. Tracked in [#85](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/85): either wire it into `ExternalAddressInput` (which looks like the intended pairing, given the naming), or remove it. Leaving unused code in the public export surface adds to the contract-test manifest (#30) and shipped package size for no current benefit.

### `PluginPage` is unused by both consumers

`PluginPage` composes `ErrorBoundary` + `ToastProvider` + PatternFly `Page`/`PageSection` specifically to eliminate boilerplate every plugin's root component would otherwise hand-write. `cockpit-caddy`'s `App.tsx` currently hand-writes exactly that composition (`<ErrorBoundary><ToastProvider><Page><PageSection>...`) instead of using it. This isn't a classification problem (the component is genuinely generic), just an adoption gap — the component does what it says, nothing's using it yet. Tracked in [#86](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/86): migrate both consumers' root component to `PluginPage`, similar in spirit to the i18n cluster's `buildLocaleResources`/`ServiceStatusBadge` adoption work.

## Non-findings (ruled out)

- `envLint.ts`'s `SENSITIVE` regex (`PASSWORD|SECRET|TOKEN|KEY|API|DSN|PRIVATE`) is a generic env-var naming convention, not Docker/Compose-specific.
- `EnvTable`'s sensitive-value detection uses the same generic regex — not container-runtime-specific.
- `useDarkMode` looked unused by both consumers in an initial pass, but is actually used internally by `CodeEditor`/`DiffEditor` (both consumers use `CodeEditor`) — not orphaned, just not imported directly.

## Not otherwise classified

`useSessionStorage` is unused by both consumers and not used internally within base either. Unlike `lib/uri.ts`, this isn't paired with an obvious intended consumer inside base's own components — noting it here for visibility, no specific recommendation beyond "keep an eye out."
