import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockProcess } from "../testing/helpers";
import { FakeHost, installFakeHost } from "../testing/host";
import { HostError, createCockpitHost, exists, getHost, mkdirp, remove, resetHost } from "./index";
import type { Host } from "./types";

afterEach(() => resetHost());

describe("cockpit adapter", () => {
  const spawn = vi.fn();
  beforeEach(() => {
    spawn.mockReset();
    vi.stubGlobal("cockpit", { spawn, file: vi.fn() });
  });

  it("runs argv with stderr as the error message by default", async () => {
    spawn.mockReturnValue(mockProcess("ok"));
    expect(await createCockpitHost().run(["echo", "hi"])).toBe("ok");
    expect(spawn).toHaveBeenCalledWith(["echo", "hi"], { superuser: undefined, err: "message", environ: undefined });
  });

  it("passes superuser, environ and stderr through", async () => {
    spawn.mockReturnValue(mockProcess(""));
    await createCockpitHost().run(["x"], { superuser: "try", environ: ["A=1"], stderr: "ignore" });
    expect(spawn).toHaveBeenCalledWith(["x"], { superuser: "try", err: "ignore", environ: ["A=1"] });
  });

  it("writes stdin and forwards output chunks while streaming", async () => {
    const proc = mockProcess(["a", "b"]);
    spawn.mockReturnValue(proc);
    const seen: string[] = [];
    const out = await createCockpitHost().run(["cat"], { stdin: "secret", onOutput: c => seen.push(c) });
    expect(proc.input).toHaveBeenCalledWith("secret");
    expect(seen).toEqual(["a", "b"]);
    expect(out).toBe("ab");
  });

  it("does not put stdin in argv", async () => {
    spawn.mockReturnValue(mockProcess(""));
    await createCockpitHost().run(["tee", "/x"], { stdin: "s3cret" });
    expect(JSON.stringify(spawn.mock.calls)).not.toContain("s3cret");
  });

  it.each([
    ["message", { message: "boom", exit_status: 2 }, "boom"],
    ["empty message falls back to output", { message: "", exit_status: 1 }, "partial output"],
    ["empty message and output fall back to the exit status", { message: "", exit_status: 3 }, "false exited with status 3"],
    ["problem code when there is nothing else", { problem: "not-found" }, "false failed: not-found"],
  ])("rejects with a HostError: %s", async (_name, failure, message) => {
    const p = Promise.reject(failure);
    p.catch(() => {});
    spawn.mockImplementation(() => Object.assign(p, { stream: (cb: (d: string) => void) => { cb(message === "partial output" ? "partial output" : ""); return p; }, input: vi.fn(), close: vi.fn() }));
    const err = await createCockpitHost().run(["false"]).catch(e => e);
    expect(err).toBeInstanceOf(HostError);
    expect((err as HostError).message).toBe(message);
    expect((err as HostError).argv).toEqual(["false"]);
  });

  it("turns a synchronous spawn failure into a HostError", async () => {
    spawn.mockImplementation(() => { throw new Error("no transport"); });
    await expect(createCockpitHost().run(["x"])).rejects.toBeInstanceOf(HostError);
  });

  it("close() cancels the underlying process", async () => {
    const proc = mockProcess("");
    spawn.mockReturnValue(proc);
    const running = createCockpitHost().run(["sleep", "9"]);
    running.close();
    expect(proc.close).toHaveBeenCalled();
    await running;
  });

  it("reads a missing file as null and escalates when asked", async () => {
    const file = vi.fn(() => ({ read: async () => null, replace: async () => undefined }));
    vi.stubGlobal("cockpit", { spawn, file });
    expect(await createCockpitHost().readFile("/nope", { superuser: "try" })).toBeNull();
    expect(file).toHaveBeenCalledWith("/nope", { superuser: "try" });
  });

  it("wraps file failures in a HostError", async () => {
    vi.stubGlobal("cockpit", { spawn, file: () => ({ read: async () => { throw { problem: "access-denied", message: "" }; } }) });
    const err = await createCockpitHost().readFile("/etc/shadow").catch(e => e);
    expect(err).toBeInstanceOf(HostError);
    expect((err as HostError).problem).toBe("access-denied");
  });
});

describe("the default host", () => {
  it("is the cockpit adapter until one is installed, and resetHost goes back to it", () => {
    vi.stubGlobal("cockpit", { spawn: vi.fn() });
    const fake = installFakeHost();
    expect(getHost()).toBe(fake);
    resetHost();
    expect(getHost()).not.toBe(fake);
  });
});

// The same behaviour must hold on the fake, or tests would pass against something the real host never does.
describe("FakeHost keeps the Host contract", () => {
  let host: FakeHost;
  beforeEach(() => { host = new FakeHost({ "/etc/a": "A" }); });

  it("reads null for a missing file and writes through", async () => {
    expect(await host.readFile("/nope")).toBeNull();
    await host.writeFile("/etc/b", "B");
    expect(await host.readFile("/etc/b")).toBe("B");
  });

  it("rejects failing commands with a HostError that carries the argv", async () => {
    const err = await host.run(["cat", "/missing"]).catch(e => e);
    expect(err).toBeInstanceOf(HostError);
    expect(err.argv).toEqual(["cat", "/missing"]);
    expect(err.exitStatus).toBe(1);
  });

  it("rejects commands nobody described, instead of succeeding", async () => {
    await expect(host.run(["systemctl", "restart", "caddy"])).rejects.toThrow(/no route/);
  });

  it("answers routed commands, last route wins, and a throwing handler becomes a HostError", async () => {
    host.onRun(["caddy", "validate"], "valid");
    host.onRun(["caddy", "validate"], () => { throw new Error("bad config"); });
    const err = await host.run(["caddy", "validate", "--config", "/x"]).catch(e => e);
    expect(err).toBeInstanceOf(HostError);
    expect(err.message).toBe("bad config");
  });

  it("delivers stdin to handlers and records it", async () => {
    host.onRun(["sh", "-c"], ({ options, host: h }) => { h.files.set("/etc/env", options.stdin ?? ""); });
    await host.run(["sh", "-c", "umask 077; cat > /etc/env"], { stdin: "TOKEN=1" });
    expect(host.files.get("/etc/env")).toBe("TOKEN=1");
    expect(host.calls[0]?.stdin).toBe("TOKEN=1");
  });

  it("close() before it settles cancels the command", async () => {
    const running = host.run(["cat", "/etc/a"]);
    running.close();
    await expect(running).rejects.toMatchObject({ problem: "terminated" });
  });

  it("models root-owned paths and Administrative access", async () => {
    host.rootOwns("/etc/secure");
    await expect(host.writeFile("/etc/secure/k", "x")).rejects.toMatchObject({ problem: "access-denied" });
    await host.writeFile("/etc/secure/k", "x", { superuser: "try" });
    expect(host.files.get("/etc/secure/k")).toBe("x");
    host.setAdmin(false);
    await expect(host.writeFile("/etc/secure/k", "y", { superuser: "try" })).rejects.toBeInstanceOf(HostError);
    await expect(host.readFile("/etc/a", { superuser: "require" })).rejects.toBeInstanceOf(HostError);
  });
});

describe("helpers work on any Host", () => {
  const hosts: [string, () => Host][] = [["FakeHost", () => new FakeHost({ "/d/f": "1" })]];
  it.each(hosts)("%s: exists, mkdirp and remove", async (_n, make) => {
    const h = make();
    expect(await exists(h, "/d/f")).toBe(true);
    expect(await exists(h, "/d/none")).toBe(false);
    await mkdirp(h, "/d/new");
    await remove(h, "/d/f");
    expect(await exists(h, "/d/f")).toBe(false);
    await remove(h, "/d/f"); // already gone: still fine
  });
});
