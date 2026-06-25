import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFile, writeFile } from "./cockpit-fs";
import { mockCockpitFile } from "../testing/helpers";

vi.stubGlobal("cockpit", {
  file: vi.fn(),
});

beforeEach(() => {
  vi.mocked(cockpit.file).mockReset();
});

describe("readFile", () => {
  it("returns file content when the file exists", async () => {
    vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile("hello world"));
    const result = await readFile("/etc/test.conf");
    expect(result).toBe("hello world");
  });

  it("returns null when the file does not exist", async () => {
    vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile(null));
    const result = await readFile("/etc/missing.conf");
    expect(result).toBeNull();
  });

  it("passes superuser option to cockpit.file", async () => {
    const spy = vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile("data"));
    await readFile("/etc/test.conf", "try");
    expect(spy).toHaveBeenCalledWith("/etc/test.conf", { superuser: "try" });
  });

  it("omits options when no superuser is specified", async () => {
    const spy = vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile("data"));
    await readFile("/etc/test.conf");
    expect(spy).toHaveBeenCalledWith("/etc/test.conf", undefined);
  });
});

describe("writeFile", () => {
  it("calls cockpit.file().replace with the content", async () => {
    const mock = mockCockpitFile("existing");
    vi.spyOn(cockpit, "file").mockReturnValue(mock);
    await writeFile("/etc/test.conf", "new content", "try");
    expect(mock.replace).toHaveBeenCalledWith("new content");
  });

  it("rejects when cockpit.file throws", async () => {
    vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile("", "Permission denied"));
    await expect(writeFile("/etc/test.conf", "data", "try")).rejects.toThrow("Permission denied");
  });
});
