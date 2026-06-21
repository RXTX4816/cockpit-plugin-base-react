/**
 * Possible states of a systemd service unit.
 *
 * - `"active"` — unit is running
 * - `"inactive"` — unit is stopped
 * - `"failed"` — unit exited with an error
 * - `"unknown"` — `systemctl is-active` returned an unrecognised value
 * - `"not-installed"` — the unit binary was not found on the system
 */
export type ServiceStatus = "active" | "inactive" | "failed" | "unknown" | "not-installed";
