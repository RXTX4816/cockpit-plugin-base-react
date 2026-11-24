import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetHost } from "../host";
import { installFakeHost, type FakeHost } from "../testing/host";
import { useServiceStatus } from "./useServiceStatus";

let host: FakeHost;

// The binary is found, and systemctl reports `status`.
function stubStatus(status: string) {
  host.onRun(["sh", "-c"], "");
  host.onRun(["systemctl", "is-active"], `${status}\n`);
}

const flushAsync = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => { host = installFakeHost(); });
afterEach(() => resetHost());

describe("useServiceStatus", () => {
  it("starts with loading=true and status='unknown'", () => {
    stubStatus("active");
    const { result } = renderHook(() => useServiceStatus("caddy"));
    expect(result.current.loading).toBe(true);
    expect(result.current.status).toBe("unknown");
  });

  it("fetches status on mount and clears loading", async () => {
    stubStatus("active");
    const { result } = renderHook(() => useServiceStatus("caddy"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe("active");
    expect(result.current.error).toBeNull();
  });

  it("resolves 'inactive' status", async () => {
    stubStatus("inactive");
    const { result } = renderHook(() => useServiceStatus("caddy"));
    await waitFor(() => expect(result.current.status).toBe("inactive"));
  });

  it("resolves 'not-installed' when which fails", async () => {
    host.onRun(["sh", "-c"], () => { throw new Error("not found"); });
    const { result } = renderHook(() => useServiceStatus("caddy"));
    await waitFor(() => expect(result.current.status).toBe("not-installed"));
  });

  it("passes the unit name through spawn calls", async () => {
    stubStatus("active");
    renderHook(() => useServiceStatus("nginx"));
    await waitFor(() => expect(host.calls[0]?.argv).toEqual(["sh", "-c", 'command -v "$1"', "sh", "nginx"]));
  });

  it("polls at the given interval", async () => {
    vi.useFakeTimers();
    try {
      stubStatus("inactive");
      renderHook(() => useServiceStatus("caddy", 2000));

      await act(flushAsync);
      expect(host.calls).toHaveLength(2); // which + systemctl (1 poll)

      stubStatus("active");
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await flushAsync();
      });
      expect(host.calls).toHaveLength(4); // 2 more spawn calls for 2nd poll
    } finally {
      vi.useRealTimers();
    }
  });

  it("updates status across poll cycles", async () => {
    vi.useFakeTimers();
    try {
      stubStatus("inactive");
      const { result } = renderHook(() => useServiceStatus("caddy", 1000));

      await act(flushAsync);
      expect(result.current.status).toBe("inactive");

      stubStatus("active");
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await flushAsync();
      });
      expect(result.current.status).toBe("active");
    } finally {
      vi.useRealTimers();
    }
  });
});
