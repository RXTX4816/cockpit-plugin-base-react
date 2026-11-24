import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetHost } from "../host";
import { installFakeHost, type FakeHost } from "../testing/host";
import {
  getServiceStatus,
  startService,
  stopService,
  restartService,
  reloadService,
  fetchServiceLogs,
  readFile,
  writeFile,
} from "./api";

let host: FakeHost;
beforeEach(() => { host = installFakeHost(); });
afterEach(() => resetHost());

const binary = (found: boolean) => host.onRun(["sh", "-c"], () => { if (!found) throw new Error("not found"); });
const isActive = (answer: string | Error) =>
  host.onRun(["systemctl", "is-active"], () => { if (answer instanceof Error) throw answer; return `${answer}\n`; });

describe("getServiceStatus", () => {
  it("returns 'not-installed' when the binary is not there", async () => {
    binary(false);
    expect(await getServiceStatus("caddy")).toBe("not-installed");
    expect(host.commands.some(c => c.startsWith("systemctl"))).toBe(false);
  });

  it.each(["active", "inactive", "failed"] as const)("returns '%s' when systemctl reports it", async state => {
    binary(true);
    isActive(state);
    expect(await getServiceStatus("caddy")).toBe(state);
  });

  it("returns 'unknown' for unexpected systemctl output", async () => {
    binary(true);
    isActive("activating");
    expect(await getServiceStatus("caddy")).toBe("unknown");
  });

  it("returns 'unknown' when systemctl itself throws", async () => {
    binary(true);
    isActive(new Error("timeout"));
    expect(await getServiceStatus("nginx")).toBe("unknown");
  });

  it("passes the unit name to command -v as an argument, not into the shell string", async () => {
    binary(false);
    await getServiceStatus("nginx");
    expect(host.calls[0]?.argv).toEqual(["sh", "-c", 'command -v "$1"', "sh", "nginx"]);
  });

  it("looks for the binary without the .service suffix", async () => {
    binary(true);
    isActive("active");
    expect(await getServiceStatus("nginx.service")).toBe("active");
    expect(host.commands).toEqual(['sh -c command -v "$1" sh nginx', "systemctl is-active nginx.service"]);
  });

  it("does not let a unit name inject shell syntax", async () => {
    binary(false);
    await getServiceStatus("x; touch /tmp/pwned");
    const argv = host.calls[0]?.argv ?? [];
    expect(argv[2]).toBe('command -v "$1"');
    expect(argv[4]).toBe("x; touch /tmp/pwned");
  });
});

describe("service control functions", () => {
  beforeEach(() => { host.onRun(["systemctl"], ""); });

  it.each([
    ["startService", startService, "start"],
    ["stopService", stopService, "stop"],
    ["restartService", restartService, "restart"],
    ["reloadService", reloadService, "reload"],
  ] as const)("%s runs systemctl %s with superuser", async (_n, fn, verb) => {
    await fn("caddy");
    expect(host.calls).toEqual([{ kind: "run", argv: ["systemctl", verb, "caddy"], stdin: undefined, superuser: "try" }]);
  });

  it("a failing systemctl rejects with its message", async () => {
    host.onRun(["systemctl", "restart"], () => { throw new Error("Unit caddy.service not found."); });
    await expect(restartService("caddy")).rejects.toThrow("Unit caddy.service not found.");
  });
});

describe("fetchServiceLogs", () => {
  it("asks journalctl for the last N lines of the unit", async () => {
    host.onRun(["journalctl"], "line\n");
    expect(await fetchServiceLogs("caddy", 50)).toBe("line\n");
    expect(host.commands).toEqual(["journalctl -u caddy -n 50 --no-pager --output=short-iso"]);
  });
});

describe("readFile / writeFile (deprecated: the Host does this)", () => {
  it("read and write with superuser", async () => {
    await writeFile("/etc/x", "1");
    expect(await readFile("/etc/x")).toBe("1");
    expect(host.calls.map(c => c.superuser)).toEqual(["try", "try"]);
    expect(await readFile("/etc/missing")).toBeNull();
  });
});
