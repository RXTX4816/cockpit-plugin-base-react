# Systemd Layer

The systemd layer provides typed hooks, a control component, and low-level API wrappers for interacting with systemd services through Cockpit.

```ts
import { useServiceStatus, ServiceControl, ServiceStatusBadge } from "@rxtx4816/cockpit-plugin-base-react/systemd";
```

---

## useServiceStatus

Reactive hook that tracks the state of a systemd service. Polls via `systemctl is-active` and returns:

- `status` — one of `"active"`, `"inactive"`, `"failed"`, `"activating"`, `"deactivating"`, `"unknown"`
- `loading` — true on the initial fetch
- `error` — any error from the underlying `cockpit.spawn` call
- `refresh()` — manually re-check the service state

The hook automatically re-polls at a configurable interval, so your UI stays in sync without manual management.

---

## ServiceControl

A self-contained component that renders start/stop/restart/enable/disable buttons for a named service. Internally uses `useServiceStatus` for the current state and the `api` helpers to dispatch commands.

Buttons are disabled while an operation is in progress. Status changes are reflected immediately via an optimistic state update, then confirmed by the next poll.

---

## ServiceStatusBadge

A `StatusBadge` pre-configured for the five `ServiceStatus` values (`active`, `inactive`, `failed`, `not-installed`, `unknown`), with built-in colors (green/grey/red/orange/grey) and labels sourced from the base i18n translations (`service.running`, `service.stopped`, `service.failed`, `service.not_installed`, `service.unknown`).

```tsx
import { ServiceStatusBadge } from "@rxtx4816/cockpit-plugin-base-react/systemd";

<ServiceStatusBadge status={status} />
```

Override individual labels with the optional `labels` prop — unset entries keep using the i18n default:

```tsx
<ServiceStatusBadge status={status} labels={{ "not-installed": "Caddy is not installed" }} />
```

---

## API helpers

Low-level typed wrappers around `cockpit.spawn` for common systemctl operations:

- `startService(name)` — `systemctl start`
- `stopService(name)` — `systemctl stop`
- `restartService(name)` — `systemctl restart`
- `enableService(name)` — `systemctl enable`
- `disableService(name)` — `systemctl disable`
- `getServiceStatus(name)` — returns the current active state string

All functions return Promises and throw on non-zero exit codes.
