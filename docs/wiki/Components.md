# Components

All components are exported from the components entrypoint:

```ts
import { ConfirmDialog, ErrorBoundary, HelpPopover, LogViewer, StatusBadge, ToastProvider } from "@rxtx4816/cockpit-plugin-base-react/components";
```

`ToastProvider` is mounted automatically by `bootstrapPlugin`. The others are available for use anywhere in your plugin.

**Stability:** every component listed here is ✅ **Stable** — part of the supported public API (`"exports"` in `package.json`), used by at least one of `cockpit-compose`/`cockpit-caddy` in production. See the [Export Audit](Export-Audit.md) for the full usage breakdown per component, and [Compatibility](Compatibility.md) for the upgrade policy around breaking changes to any of these.

---

## ConfirmDialog

A PatternFly modal dialog driven by `useConfirmAction` state. Supports multi-step confirmation flows — for example, showing a warning first and requiring the user to type a resource name before proceeding.

Receives the `state` and `cancel` from `useConfirmAction` and renders the appropriate step content. Traps focus while open and restores it to the triggering element on close (see [Accessibility](Accessibility.md)).

---

## ErrorBoundary

A React error boundary that catches render errors anywhere in the component tree and displays a PatternFly alert with the error message and stack trace. Prevents the entire plugin from going blank on an unexpected error.

Mounted automatically by `bootstrapPlugin`, but can also be used to wrap specific subtrees. `fallbackTitle` defaults to a translated "Something went wrong" (see [Getting Started § Inheriting base component translations](Getting-Started.md#inheriting-base-component-translations)).

---

## HelpPopover

A small PatternFly popover for contextual help. Renders a help icon button that opens a popover with a title and body text. Use it next to form fields or section headings to explain non-obvious behaviour. The trigger is a real `<button>`, so it's keyboard-operable without extra wiring.

---

## LogViewer

A scrollable, terminal-style log display that accepts an array of output lines (typically from `useAsyncStream`). Automatically scrolls to the bottom on new output. Supports search/filter, regex mode, pretty-printed JSON lines, and downloading the visible output. Used for displaying real-time command output or service journal entries.

---

## StatusBadge

A color-coded label for an arbitrary status value, driven entirely by the `config` prop you pass (a `Record<string, StatusBadgeConfig>` mapping status strings to `{ color, label }`). Generic — it doesn't know about systemd, HTTP, or anything else; see `ServiceStatusBadge` in the [Systemd Layer](Systemd.md) for a version preconfigured for the five systemd unit states.

---

## ToastProvider

Global toast notification context. Wrap your app with `ToastProvider` (done automatically by `bootstrapPlugin`) and use the `useToast` hook to fire notifications from anywhere:

```ts
const toast = useToast();
toast.success("Saved");
toast.error("Something went wrong", "The server returned a 500 error.");
// or the general form: toast.addToast("warning", "Configuration incomplete");
```

Toasts are displayed in the top-right corner and auto-dismiss after 5 seconds. `useToast()` returns a no-op implementation when called outside a `ToastProvider`, so it's safe to use in unit tests without wrapping every render in a provider.

---

## PluginPage

Root layout wrapper for a plugin's top-level component: composes `ErrorBoundary` + `ToastProvider` + PatternFly `Page`/`PageSection` in one call, so you don't hand-write that composition yourself.

```tsx
export function App() {
  return (
    <PluginPage fallbackTitle="Error loading My Plugin">
      <MyContent />
    </PluginPage>
  );
}
```

Neither `cockpit-compose` nor `cockpit-caddy` has adopted this yet as of this writing (both currently hand-compose the same structure) — see [#86](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/86) for the tracked migration.

---

## ExternalLinkModal

A confirmation modal shown before navigating to an external URL — warns the user they're leaving the plugin and requires an explicit "Continue" click. Same focus-trap/Escape-to-close contract as `ConfirmDialog`.

```tsx
{pendingUrl && (
  <ExternalLinkModal url={pendingUrl} onClose={() => setPendingUrl(null)} />
)}
```

All label text (`title`, `ariaLabel`, `warningTitle`, `continueButton`, `cancelButton`) is overridable via the `labels` prop; unset fields fall back to the base i18n translation.

---

## Tooltip

A thin wrapper around PatternFly's `Tooltip` with `exitDelay` defaulted to `0` (PatternFly's own default has a noticeable lingering delay that reads as sluggish in a dense admin UI). Otherwise identical to PatternFly's `Tooltip` — same props, same `trigger="mouseenter focus"` default (so content is reachable via keyboard focus, not just hover).

---

## CollapsibleSearch

A search input that collapses to an icon-only button when empty and not focused, expanding on click/focus. Useful in toolbars where a full-width search box would crowd other controls when unused.

---

## LayoutSelector

A PatternFly `ToggleGroup` for switching between named layout options (e.g. "table" vs "grid" view), each with an icon. Generic over the layout key type — pass `LayoutOption<T>[]` for whatever string union your plugin uses.

---

## PluginFooter

A footer bar showing the plugin's version string and a row of links (e.g. "Report an issue", "Documentation"). Purely presentational — you provide the version string and link list.

---

## CodeEditor

A CodeMirror 6-based code editor, pre-wired with a dark/light theme that follows `useDarkMode`. Accepts extra CodeMirror `extensions` (e.g. a language mode or linter) via props. `DiffEditor`, `EnvEditor` build on top of this.

**Peer dependency note:** requires `codemirror` and `@codemirror/*` packages (see `package.json`'s `peerDependenciesMeta` — they're optional peers, only needed if you actually import `CodeEditor`/`DiffEditor`/`EnvEditor`).

---

## DiffEditor

A side-by-side/unified diff view built on CodeMirror's merge extension, for showing `original` vs `modified` text (e.g. a config file before/after an edit). Same dark-mode and peer-dependency notes as `CodeEditor`.

---

## EnvEditor

A `CodeEditor` preconfigured with a linter for `.env`-file syntax (`KEY=VALUE` lines, `#` comments) — flags missing `=`, duplicate keys, and other common mistakes via `lib/envLint`'s `lintEnvContent`. Used by `cockpit-compose` for editing container environment files.

---

## EnvTable

An alternative to `EnvEditor` for editing environment variables as a structured key/value table rather than raw text, with automatic masking of values whose key looks like a secret (matches `PASSWORD`, `SECRET`, `TOKEN`, `KEY`, `API`, `DSN`, or `PRIVATE`, case-insensitive) behind a reveal/hide toggle.

---

## ExternalAddressInput

A two-row input for an external listener address: protocol/host on row 1, port on row 2. Ships a built-in list of HTTP-family protocols (`http`, `https`, `h2`, `h2c`, `h3`) — this is a caddy-specific assumption baked into an otherwise generic-looking component; see [#84](https://github.com/RXTX4816/cockpit-plugin-base-react/issues/84) if you need a non-HTTP scheme list. `suggestedSchemes` lets you add options but not remove the built-in ones.
