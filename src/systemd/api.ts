import type { ServiceStatus } from "./types";
import { getHost } from "../host";

/**
 * Returns the current {@link ServiceStatus} of a systemd unit.
 *
 * Checks with `command -v` first (on the unit name without `.service`) — returns
 * `"not-installed"` when that binary is absent.
 * Then calls `systemctl is-active` and maps the output to a {@link ServiceStatus} value.
 *
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function getServiceStatus(unit: string): Promise<ServiceStatus> {
  try {
    // The unit name is an argument, never part of the shell string, and a
    // trailing ".service" is dropped because the binary has no such suffix.
    await getHost().run(["sh", "-c", 'command -v "$1"', "sh", unit.replace(/\.service$/, "")], { stderr: "ignore" });
  } catch {
    return "not-installed";
  }

  try {
    const status = await getHost().run(["systemctl", "is-active", unit], { stderr: "ignore" });
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
  await getHost().run(["systemctl", "start", unit], { superuser: "try" });
}

/**
 * Stops the given systemd unit via `systemctl stop`. Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function stopService(unit: string): Promise<void> {
  await getHost().run(["systemctl", "stop", unit], { superuser: "try" });
}

/**
 * Restarts the given systemd unit via `systemctl restart`. Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function restartService(unit: string): Promise<void> {
  await getHost().run(["systemctl", "restart", unit], { superuser: "try" });
}

/**
 * Reloads the configuration of the given systemd unit via `systemctl reload`.
 * Requests superuser escalation.
 * @param unit - The systemd unit name (e.g. `"nginx.service"`).
 */
export async function reloadService(unit: string): Promise<void> {
  await getHost().run(["systemctl", "reload", unit], { superuser: "try" });
}

/**
 * Reads a file from the host filesystem via Cockpit, requesting superuser escalation.
 * @param path - Absolute path to the file.
 * @deprecated Use `getHost().readFile(path, { superuser: "try" })` from `@rxtx4816/cockpit-plugin-base-react/host`.
 */
export async function readFile(path: string): Promise<string | null> {
  return getHost().readFile(path, { superuser: "try" });
}

/**
 * Writes content to a file on the host filesystem via Cockpit, requesting superuser escalation.
 * @param path    - Absolute path to the file.
 * @param content - UTF-8 string content to write.
 * @deprecated Use `getHost().writeFile(path, content, { superuser: "try" })` from `@rxtx4816/cockpit-plugin-base-react/host`.
 */
export async function writeFile(path: string, content: string): Promise<void> {
  return getHost().writeFile(path, content, { superuser: "try" });
}

/**
 * Fetches recent journal entries for a systemd unit via `journalctl`.
 * @param unit  - The systemd unit name (e.g. `"caddy.service"`).
 * @param lines - Number of lines to return (default 300).
 */
export async function fetchServiceLogs(unit: string, lines = 300): Promise<string> {
  return getHost().run(
    ["journalctl", "-u", unit, "-n", String(lines), "--no-pager", "--output=short-iso"],
    { superuser: "try" },
  );
}
