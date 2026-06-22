import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockProcess } from "../testing/helpers";
import { createTarArchive, extractTarArchive, listTarArchives } from "./tar";

const mockSpawn = vi.fn();
vi.stubGlobal("cockpit", { spawn: mockSpawn });

beforeEach(() => mockSpawn.mockReset());

describe("createTarArchive", () => {
  it("spawns tar with the correct base arguments", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await createTarArchive("/dest/out.tar.gz", "/src", "mydir");
    const args = mockSpawn.mock.calls[0][0] as string[];
    expect(args).toContain("tar");
    expect(args).toContain("-czf");
    expect(args).toContain("/dest/out.tar.gz");
    expect(args).toContain("-C");
    expect(args).toContain("/src");
    expect(args[args.length - 1]).toBe("mydir");
  });

  it("resolves with {} on success", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    const result = await createTarArchive("/out.tar.gz", "/src", "dir");
    expect(result).toEqual({});
  });

  it("appends --exclude patterns before the source name", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await createTarArchive("/out.tar.gz", "/src", "dir", { exclude: ["*.log", "*.tmp"] });
    const args = mockSpawn.mock.calls[0][0] as string[];
    const dirIdx = args.lastIndexOf("dir");
    expect(args).toContain("--exclude=*.log");
    expect(args).toContain("--exclude=*.tmp");
    expect(args.indexOf("--exclude=*.log")).toBeLessThan(dirIdx);
  });

  it("inserts extraArgs BEFORE --exclude patterns", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await createTarArchive("/out.tar.gz", "/src", "dir", {
      extraArgs: ["--wildcards"],
      exclude: ["*.snap"],
    });
    const args = mockSpawn.mock.calls[0][0] as string[];
    const wildcardsIdx = args.indexOf("--wildcards");
    const excludeIdx = args.indexOf("--exclude=*.snap");
    expect(wildcardsIdx).toBeGreaterThan(-1);
    expect(excludeIdx).toBeGreaterThan(-1);
    expect(wildcardsIdx).toBeLessThan(excludeIdx);
  });

  it("passes superuser option to cockpit.spawn", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await createTarArchive("/out.tar.gz", "/src", "dir", { superuser: "require" });
    expect(mockSpawn.mock.calls[0][1]).toMatchObject({ superuser: "require" });
  });



  it("resolves with { warning } when tar fails but archive exists (partial success)", async () => {
    mockSpawn.mockRejectedValueOnce(new Error("some files not readable"));
    mockSpawn.mockReturnValue(mockProcess(""));
    const result = await createTarArchive("/out.tar.gz", "/src", "dir");
    expect(result.warning).toBe("some files not readable");
  });

  it("throws when tar fails and archive does not exist", async () => {
    const tarErr = new Error("disk full");
    mockSpawn.mockRejectedValueOnce(tarErr);
    mockSpawn.mockRejectedValueOnce(new Error("no such file"));
    await expect(createTarArchive("/out.tar.gz", "/src", "dir")).rejects.toThrow("disk full");
  });
});

describe("extractTarArchive", () => {
  it("spawns tar -xzf with the archive and destination", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await extractTarArchive("/backup.tar.gz", "/restore/dest");
    const args = mockSpawn.mock.calls[0][0] as string[];
    expect(args).toEqual(["tar", "-xzf", "/backup.tar.gz", "-C", "/restore/dest"]);
  });

  it("passes superuser option", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await extractTarArchive("/backup.tar.gz", "/restore/dest", { superuser: "require" });
    expect(mockSpawn.mock.calls[0][1]).toMatchObject({ superuser: "require" });
  });

  it("propagates errors from cockpit.spawn", async () => {
    mockSpawn.mockRejectedValueOnce(new Error("permission denied"));
    await expect(extractTarArchive("/backup.tar.gz", "/dest")).rejects.toThrow("permission denied");
  });
});

describe("listTarArchives", () => {
  it("spawns find with the pattern and depth", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await listTarArchives("/etc/caddy", "caddy-*.tar.gz");
    const args = mockSpawn.mock.calls[0][0] as string[];
    expect(args[0]).toBe("find");
    expect(args).toContain("/etc/caddy");
    expect(args).toContain("caddy-*.tar.gz");
    expect(args).toContain("-maxdepth");
    expect(args).toContain("2"); // default depth
  });

  it("uses the provided maxDepth", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    await listTarArchives("/dir", "*.tar.gz", { maxDepth: 5 });
    const args = mockSpawn.mock.calls[0][0] as string[];
    const depthIdx = args.indexOf("-maxdepth");
    expect(args[depthIdx + 1]).toBe("5");
  });

  it("returns sorted and reversed list of found paths", async () => {
    const output = "/dir/a.tar.gz\n/dir/b.tar.gz\n/dir/c.tar.gz\n";
    mockSpawn.mockReturnValue(mockProcess(output));
    const result = await listTarArchives("/dir", "*.tar.gz");
    expect(result).toEqual(["/dir/c.tar.gz", "/dir/b.tar.gz", "/dir/a.tar.gz"]);
  });

  it("returns [] for empty output", async () => {
    mockSpawn.mockReturnValue(mockProcess(""));
    const result = await listTarArchives("/dir", "*.tar.gz");
    expect(result).toEqual([]);
  });
});
