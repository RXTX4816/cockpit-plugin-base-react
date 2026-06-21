import type { ServiceStatus } from "./types";

/**
 * Returns the current {@link ServiceStatus} of a systemd unit.
 *
 * Checks with `which` first — returns `"not-installed"` when the unit binary is absent.
 * Then calls `systemctl is-active` and maps the output to a {@link ServiceStatus} value.
 *
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function getServiceStatus(unit: string): Promise<ServiceStatus> {
  try {
    await cockpit.spawn(["which", unit]);
  } catch {
    return "not-installed";
  }

  try {
    const status = await cockpit.spawn(["systemctl", "is-active", unit]);
    const trimmed = status.trim();
    if (trimmed === "active") return "active";
    if (trimmed === "inactive") return "inactive";
    if (trimmed === "failed") return "failed";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Starts the given systemd unit via `systemctl start`. Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function startService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "start", unit], { superuser: "try" });
}

/**
 * Stops the given systemd unit via `systemctl stop`. Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function stopService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "stop", unit], { superuser: "try" });
}

/**
 * Restarts the given systemd unit via `systemctl restart`. Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function restartService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "restart", unit], { superuser: "try" });
}

/**
 * Reloads the configuration of the given systemd unit via `systemctl reload`.
 * Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function reloadService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "reload", unit], { superuser: "try" });
}
