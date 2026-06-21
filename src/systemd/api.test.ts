import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockProcess } from "../testing/helpers";
import {
  getServiceStatus,
  startService,
  stopService,
  restartService,
  reloadService,
} from "./api";

const mockSpawn = vi.fn();
vi.stubGlobal("cockpit", { spawn: mockSpawn });

beforeEach(() => { mockSpawn.mockReset(); });

describe("getServiceStatus", () => {
  it("returns 'not-installed' when which fails", async () => {
    mockSpawn.mockRejectedValueOnce(new Error("not found"));
    expect(await getServiceStatus("caddy")).toBe("not-installed");
  });

  it("returns 'active' when systemctl reports active", async () => {
    mockSpawn.mockResolvedValueOnce(""); // which succeeds
    mockSpawn.mockResolvedValueOnce("active\n");
    expect(await getServiceStatus("caddy")).toBe("active");
  });

  it("returns 'inactive' when systemctl reports inactive", async () => {
    mockSpawn.mockResolvedValueOnce("");
    mockSpawn.mockResolvedValueOnce("inactive\n");
    expect(await getServiceStatus("caddy")).toBe("inactive");
  });

  it("returns 'failed' when systemctl reports failed", async () => {
    mockSpawn.mockResolvedValueOnce("");
    mockSpawn.mockResolvedValueOnce("failed\n");
    expect(await getServiceStatus("caddy")).toBe("failed");
  });

  it("returns 'unknown' for unexpected systemctl output", async () => {
    mockSpawn.mockResolvedValueOnce("");
    mockSpawn.mockResolvedValueOnce("activating\n");
    expect(await getServiceStatus("caddy")).toBe("unknown");
  });

  it("returns 'unknown' when systemctl itself throws", async () => {
    mockSpawn.mockResolvedValueOnce("");
    mockSpawn.mockRejectedValueOnce(new Error("timeout"));
    expect(await getServiceStatus("nginx")).toBe("unknown");
  });

  it("passes the unit name to which", async () => {
    mockSpawn.mockRejectedValueOnce(new Error("not found"));
    await getServiceStatus("nginx");
    expect(mockSpawn).toHaveBeenCalledWith(["which", "nginx"]);
  });
});

describe("service control functions", () => {
  beforeEach(() => {
    mockSpawn.mockResolvedValue(mockProcess(""));
  });

  it("startService calls systemctl start with the unit", async () => {
    await startService("caddy");
    expect(mockSpawn).toHaveBeenCalledWith(["systemctl", "start", "caddy"], { superuser: "try" });
  });

  it("stopService calls systemctl stop with the unit", async () => {
    await stopService("nginx");
    expect(mockSpawn).toHaveBeenCalledWith(["systemctl", "stop", "nginx"], { superuser: "try" });
  });

  it("restartService calls systemctl restart with the unit", async () => {
    await restartService("caddy");
    expect(mockSpawn).toHaveBeenCalledWith(["systemctl", "restart", "caddy"], { superuser: "try" });
  });

  it("reloadService calls systemctl reload with the unit", async () => {
    await reloadService("caddy");
    expect(mockSpawn).toHaveBeenCalledWith(["systemctl", "reload", "caddy"], { superuser: "try" });
  });
});
