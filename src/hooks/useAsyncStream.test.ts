import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAsyncStream } from "./useAsyncStream";
import { mockProcess } from "../testing/helpers";

function mockRunningProcess(initialData: string): CockpitProcess {
  let streamCb: ((data: string) => void) | null = null;
  const p = new Promise<string>(() => {}); // never resolves — process stays "running"
  queueMicrotask(() => { if (streamCb) streamCb(initialData); });
  return Object.assign(p, {
    stream: (cb: (data: string) => void) => { streamCb = cb; return p as CockpitProcess; },
    close: vi.fn(),
    input: vi.fn(),
    wait: () => p,
  }) as CockpitProcess;
}

describe("useAsyncStream", () => {
  it("accumulates lines from streamed output", async () => {
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        launch(mockProcess("line1\nline2\nline3\n"));
      }, []),
    );

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.lines).toEqual(["line1", "line2", "line3"]);
    expect(result.current.failed).toBe(false);
  });

  it("handles multi-chunk output", async () => {
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        launch(mockProcess(["hello\n", "world\n"]));
      }, []),
    );

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.lines).toEqual(["hello", "world"]);
  });

  it("handles \\r overwrite sequences by taking the last content on a line", async () => {
    // \r without \n: "loading...\rprogress: 50%" on a single logical line
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        launch(mockProcess("loading...\rprogress: 50%\n"));
      }, []),
    );

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.lines).toEqual(["progress: 50%"]);
  });

  it("sets failed and errorMsg on process error", async () => {
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        launch(mockProcess("partial\n", "process failed"));
      }, []),
    );

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.failed).toBe(true);
    expect(result.current.errorMsg).toBe("process failed");
  });

  it("sets failed when startProcess itself throws", async () => {
    const { result } = renderHook(() =>
      useAsyncStream(async () => {
        throw new Error("launch error");
      }, []),
    );

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.failed).toBe(true);
    expect(result.current.errorMsg).toBe("launch error");
  });

  it("starts empty and not done", () => {
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        launch(mockRunningProcess(""));
      }, []),
    );
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.done).toBe(false);
  });

  it("cancel() closes the running process", async () => {
    let capturedProc!: CockpitProcess;
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        capturedProc = mockRunningProcess("line1\n");
        launch(capturedProc);
      }, []),
    );

    await waitFor(() => expect(result.current.lines).toHaveLength(1));
    act(() => { result.current.cancel(); });
    expect(capturedProc.close).toHaveBeenCalled();
  });

  // startProcess is free to await before it calls launch (resolving superuser access,
  // say). Cancelling inside that window used to do nothing: there was no process to
  // close yet, and the pending launch went ahead regardless — the user cancelled and
  // the work ran anyway.
  it("cancel() before launch stops the process from starting", async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    let capturedProc!: CockpitProcess;

    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        await gate;
        capturedProc = mockRunningProcess("line1\n");
        launch(capturedProc);
      }, []),
    );

    // Cancel while startProcess is still awaiting — nothing has launched yet.
    act(() => { result.current.cancel(); });

    release();
    await act(async () => { await gate; });

    // The late launch must close the process it was handed instead of streaming it.
    await waitFor(() => expect(capturedProc.close).toHaveBeenCalled());
    expect(result.current.lines).toEqual([]);
  });

  it("cancel() stops a late completion from flipping done", async () => {
    let resolveProc!: (v: string) => void;
    const { result } = renderHook(() =>
      useAsyncStream(async launch => {
        const p = new Promise<string>(r => { resolveProc = r; });
        launch(Object.assign(p, {
          stream: () => p as CockpitProcess,
          close: vi.fn(),
          input: vi.fn(),
          wait: () => p,
        }) as CockpitProcess);
      }, []),
    );

    await waitFor(() => expect(result.current.done).toBe(false));
    act(() => { result.current.cancel(); });
    await act(async () => { resolveProc("done"); });

    expect(result.current.done).toBe(false);
  });

  it("resets state when deps change", async () => {
    let dep = 1;
    const { result, rerender } = renderHook(() =>
      useAsyncStream(async launch => {
        launch(mockProcess("line\n"));
      }, [dep]),
    );

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.lines).toHaveLength(1);

    dep = 2;
    rerender();

    expect(result.current.lines).toHaveLength(0);
    expect(result.current.done).toBe(false);

    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.lines).toHaveLength(1);
  });
});
