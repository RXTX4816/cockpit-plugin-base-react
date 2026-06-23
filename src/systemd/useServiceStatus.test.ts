import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useServiceStatus } from "./useServiceStatus";

const mockSpawn = vi.fn();
vi.stubGlobal("cockpit", { spawn: mockSpawn });

function stubStatus(status: string) {
  mockSpawn
    .mockResolvedValueOnce("") // which <unit> succeeds
    .mockResolvedValueOnce(`${status}\n`); // systemctl is-active <unit>
}

const flushAsync = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => { mockSpawn.mockReset(); });

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
    mockSpawn.mockRejectedValueOnce(new Error("not found"));
    const { result } = renderHook(() => useServiceStatus("caddy"));
    await waitFor(() => expect(result.current.status).toBe("not-installed"));
  });

  it("passes the unit name through spawn calls", async () => {
    stubStatus("active");
    renderHook(() => useServiceStatus("nginx"));
    await waitFor(() => expect(mockSpawn).toHaveBeenCalledWith(["sh", "-c", "command -v nginx"]));
  });

  it("polls at the given interval", async () => {
    vi.useFakeTimers();
    try {
      stubStatus("inactive");
      renderHook(() => useServiceStatus("caddy", 2000));

      await act(flushAsync);
      expect(mockSpawn).toHaveBeenCalledTimes(2); // which + systemctl (1 poll)

      stubStatus("active");
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await flushAsync();
      });
      expect(mockSpawn).toHaveBeenCalledTimes(4); // 2 more spawn calls for 2nd poll
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
