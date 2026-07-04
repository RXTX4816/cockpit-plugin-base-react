# Hooks

All hooks are exported from the main entrypoint:

```ts
import { useAsyncAction, useAutoRefresh, useAsyncStream, useConfirmAction, usePollingFetch } from "@rxtx4816/cockpit-plugin-base-react";
```

**Stability:** every hook listed here is ✅ **Stable** — part of the supported public API. Usage varies per consumer (e.g. `useAsyncAction`/`useAsyncStream`/`useKeyboardShortcuts`/`useOperationCounter`/`usePersistedSet` are currently compose-only, `useConfirmAction`/`useLocalStorage` are currently caddy-only) — that's expected for a shared library, not a sign a hook is unsupported. See the [Export Audit](Export-Audit.md) for the full usage breakdown.

---

## useAsyncAction

Wraps an async operation with `loading`, `error`, and `execute` state. Designed for buttons or forms that trigger backend calls.

The hook returns an object with:
- `execute(...args)` — triggers the operation
- `loading` — true while the operation is in progress
- `error` — the caught error if the operation failed, or null
- `reset()` — clears error state

Errors are caught automatically; unhandled promise rejections do not propagate to the component tree.

---

## useAutoRefresh

Runs a callback on a configurable interval. Returns a `refresh()` function for on-demand triggering and a `loading` flag.

Useful for periodically re-fetching data without managing `setInterval` lifecycle yourself. The interval is cleared on unmount.

---

## useAsyncStream

Consumes a Cockpit channel as a line-buffered async stream. Returns the accumulated output lines and an `error` state.

Used internally by `LogViewer` and useful anywhere you need to display or process real-time output from a spawned process.

---

## useConfirmAction

Manages a multi-step confirmation flow with typed state transitions. Returns:

- `state` — current step or `null` when idle
- `start(initialStep)` — opens the flow
- `next(step)` — advances to the next step
- `cancel()` — resets to idle

Pairs with `ConfirmDialog` to build destructive action flows (e.g. delete with a typed confirmation).

---

## usePollingFetch

Fetches a resource with automatic polling and returns `{ data, loading, error, refresh }`. The poll interval is configurable.

Handles the full lifecycle: initial fetch, polling, cleanup on unmount, and error recovery. Calling `refresh()` triggers an immediate re-fetch and resets the poll timer.

---

## useAdminMode

Returns whether the current Cockpit session has administrative (superuser) access, reactively updating if it changes: `null` while still determining, `true` once granted, `false` in limited mode (privileged operations will fail). Backed by `cockpit.permission({ admin: true })`.

---

## useDialogState

Manages open/close state and associated data for a fixed set of named dialogs — useful when a component has several related modals (confirm → progress → done) that need to share or hand off data between steps.

```ts
type Modals = { delete: { id: string }; create: undefined };
const modals = useDialogState<Modals>(["delete", "create"]);

modals.open("delete", { id: "abc" });
modals.isOpen("delete");       // true
modals.getData("delete");      // { id: "abc" }
modals.transition("delete", "create"); // closes "delete", opens "create"
modals.close("create");
```

---

## useLayout

Persists a "current layout" choice (e.g. `"table"` vs `"grid"`) to `localStorage`, validated against a fixed set of allowed values, with optional cross-tab sync:

```ts
const [layout, setLayout] = useLayout("my-plugin:layout", "table", ["table", "grid"], { crossTabSync: true });
```

---

## useLocalStorage / useSessionStorage

Typed, JSON-serialized read/write hooks for `localStorage`/`sessionStorage`, returning `[value, setValue, remove]`. `useLocalStorage` supports `crossTabSync` (via the `storage` event); `useSessionStorage` doesn't, since `sessionStorage` is inherently per-tab. Both accept custom `serialize`/`deserialize` if the default `JSON.stringify`/`JSON.parse` isn't right for your value type.

---

## usePersistedSet

A `localStorage`-backed `Set<string>` with `toggle`/`clear`, and optional cross-tab sync. Useful for accordion expanded-state, multi-selection, or "dismissed" tracking that should survive a page reload.

---

## useDarkMode

Reactively tracks whether PatternFly's dark theme class (`pf-v6-theme-dark`) is present on `<html>`, via a `MutationObserver`. Used internally by `CodeEditor`/`DiffEditor` to pick a matching editor theme; also exported directly for any other dark-mode-aware rendering you need.

---

## useOperationCounter

Tracks a count of active in-flight operations via `increment()`/`decrement()`, returning `activeOps`. Useful for suppressing auto-refresh (e.g. via `useAutoRefresh`) while a mutation is in progress, so a poll doesn't clobber optimistic UI state.

---

## useKeyboardShortcuts

Binds global keydown handlers for single-key shortcuts, automatically skipping when the user is typing in a form field (`input`/`textarea`/`select`/`contenteditable`) or a PatternFly modal is open:

```ts
useKeyboardShortcuts({ "n": () => openCreateDialog(), "/": () => focusSearch() });
```
