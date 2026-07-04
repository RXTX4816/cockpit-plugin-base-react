# Accessibility

This page documents accessibility expectations for shared components, and how their tests verify them.

## Test approach

Component-level a11y tests use [`jest-axe`](https://github.com/nickcolley/jest-axe) (registered only in this repo's own `vitest.config.ts` via `src/testing/a11y-setup.ts` — not exported to consumers, so adopting it doesn't pull `axe-core` into downstream plugin test suites).

PatternFly's `Modal` renders via a React portal to `document.body`, so a11y scans for dialog components must scan `document.body`, not the Testing Library render `container`.

## Component expectations

| Component | Expectation | Verified by |
|---|---|---|
| `ConfirmDialog` | Traps focus while open; moves initial focus into the dialog; returns focus to the triggering element on close; closes on Escape; no axe violations (including with the inline error alert shown). | `ConfirmDialog.test.tsx` |
| `ExternalLinkModal` | Same dialog contract as `ConfirmDialog`. | `ExternalLinkModal.test.tsx` |
| `ToastProvider` | Toasts render in a `role="alert"`-equivalent live region (PatternFly `AlertGroup isLiveRegion`); no axe violations while a toast is visible. | `ToastProvider.test.tsx` |
| `PluginPage` | No axe violations for the composed `ErrorBoundary` + `ToastProvider` + `Page` shell. | `PluginPage.test.tsx` |
| `Tooltip` | Content is reachable via keyboard: shows on focus, not just hover (PatternFly's default `trigger="mouseenter focus"`). | `Tooltip.test.tsx` |
| `HelpPopover` | Trigger is a real `<button>` (native Enter/Space activation); popover opens on click/activation and closes on Escape; no axe violations. | `HelpPopover.test.tsx` |

## Known issue found during this pass

`LogViewer`'s error/download alerts use PatternFly's `Alert` default title element (`<h4>`). Unlike `ConfirmDialog`/`ExternalLinkModal`, `LogViewer` isn't wrapped in a modal with a fixed heading level, so whether this causes a real heading-order violation depends on the surrounding page's own heading structure — not something this component can control in isolation. Worth a look if `LogViewer` is ever audited on a real page.

## Adding a11y coverage to a new component

1. Import `axe` from `jest-axe` and add `expect(await axe(container)).toHaveNoViolations();` (or `document.body` for anything portal-rendered, like `Modal`).
2. For anything with a focus trap (PatternFly `Modal`), remember `focus-trap`'s initial-focus call is deferred via `setTimeout(fn, 0)` — wrap the assertion in `waitFor`.
3. For keyboard interaction, prefer asserting on real semantics (native `<button>`, `role="dialog"` + Escape) over re-testing what the underlying PatternFly/React component already guarantees.
