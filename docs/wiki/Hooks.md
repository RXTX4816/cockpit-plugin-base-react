# Hooks

All hooks are exported from the main entrypoint:

```ts
import { useAsyncAction, useAutoRefresh, useAsyncStream, useConfirmAction, usePollingFetch } from "@rxtx4816/cockpit-plugin-base-react";
```

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
