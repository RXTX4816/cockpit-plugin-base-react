import { afterEach, describe, expect, it, vi } from "vitest";
import { resetHost } from "../host";
import { installFakeHost } from "../testing/host";
import { saveTextToDownloads } from "./saveText";

afterEach(() => resetHost());

describe("saveTextToDownloads", () => {
  it("writes a timestamped .txt into ~/Downloads and returns its path", async () => {
    vi.stubGlobal("cockpit", { user: async () => ({ home: "/home/tok" }) });
    const host = installFakeHost();
    const path = await saveTextToDownloads("line1\nline2", "caddy-logs");
    expect(path).toMatch(/^\/home\/tok\/Downloads\/caddy-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/);
    expect(host.files.get(path)).toBe("line1\nline2");
    expect(host.commands).toContain("mkdir -p -- /home/tok/Downloads");
  });

  it("rejects when the folder cannot be written", async () => {
    vi.stubGlobal("cockpit", { user: async () => ({ home: "/home/tok" }) });
    installFakeHost().rootOwns("/home/tok/Downloads");
    await expect(saveTextToDownloads("x", "f")).rejects.toThrow(/Permission denied/);
  });
});
