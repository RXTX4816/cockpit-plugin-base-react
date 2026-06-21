import type { ServiceStatus } from "./types";

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

export async function startService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "start", unit], { superuser: "try" });
}

export async function stopService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "stop", unit], { superuser: "try" });
}

export async function restartService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "restart", unit], { superuser: "try" });
}

export async function reloadService(unit: string): Promise<void> {
  await cockpit.spawn(["systemctl", "reload", unit], { superuser: "try" });
}
