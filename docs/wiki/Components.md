# Components

All components are exported from the components entrypoint:

```ts
import { ConfirmDialog, ErrorBoundary, HelpPopover, LogViewer, StatusBadge, ToastProvider } from "@rxtx4816/cockpit-plugin-base-react/components";
```

`ToastProvider` is mounted automatically by `bootstrapPlugin`. The others are available for use anywhere in your plugin.

---

## ConfirmDialog

A PatternFly modal dialog driven by `useConfirmAction` state. Supports multi-step confirmation flows — for example, showing a warning first and requiring the user to type a resource name before proceeding.

Receives the `state` and `cancel` from `useConfirmAction` and renders the appropriate step content.

---

## ErrorBoundary

A React error boundary that catches render errors anywhere in the component tree and displays a PatternFly alert with the error message and stack trace. Prevents the entire plugin from going blank on an unexpected error.

Mounted automatically by `bootstrapPlugin`, but can also be used to wrap specific subtrees.

---

## HelpPopover

A small PatternFly popover for contextual help. Renders a help icon button that opens a popover with a title and body text. Use it next to form fields or section headings to explain non-obvious behaviour.

---

## LogViewer

A scrollable, terminal-style log display that accepts an array of output lines (typically from `useAsyncStream`). Automatically scrolls to the bottom on new output. Used for displaying real-time command output or service journal entries.

---

## StatusBadge

A color-coded label for service or resource states. Maps state strings (e.g. `"active"`, `"failed"`, `"inactive"`, `"unknown"`) to PatternFly status colors. Used by `ServiceControl` and can be used standalone wherever you need to display a state.

---

## ToastProvider

Global toast notification context. Wrap your app with `ToastProvider` (done automatically by `bootstrapPlugin`) and use the `useToast` hook to fire notifications from anywhere:

```ts
const { addToast } = useToast();
addToast({ title: "Saved", variant: "success" });
```

Toasts are displayed in the top-right corner and auto-dismiss after a configurable timeout.
