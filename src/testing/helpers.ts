import { vi } from "vitest";

/**
 * Creates a fake `CockpitProcess` that emits `data` chunks then resolves (or rejects).
 *
 * @param data - One or more output chunks delivered via the `stream` callback.
 * @param error - When provided, the process rejects with this message instead of resolving.
 *
 * @example
 * ```ts
 * vi.spyOn(cockpit, "spawn").mockReturnValue(mockProcess("hello\nworld\n"));
 * ```
 */
export function mockProcess(data: string | string[], error?: string): CockpitProcess {
  const chunks = Array.isArray(data) ? data : [data];
  let streamCb: ((data: string) => void) | null = null;
  const p = new Promise<string>((resolve, reject) => {
    queueMicrotask(() => {
      for (const chunk of chunks) {
        if (streamCb && chunk) streamCb(chunk);
      }
      if (error) reject(new Error(error));
      else resolve(chunks.join(""));
    });
  });
  return Object.assign(p, {
    stream: (cb: (data: string) => void) => { streamCb = cb; return p as CockpitProcess; },
    close: vi.fn(),
    input: vi.fn(),
    wait: () => p,
  }) as CockpitProcess;
}

/**
 * Creates a fake `CockpitHttpClient` whose `get` method returns canned responses.
 *
 * @param responses - Map of URL paths to response body strings. Unmatched paths return `"{}"`.
 */
export function mockHttpClient(responses: Record<string, string> = {}): CockpitHttpClient {
  return {
    get: vi.fn((path: string) => Promise.resolve(responses[path] ?? "{}")),
    post: vi.fn(() => Promise.resolve("")),
    request: vi.fn(() => Promise.resolve({ status: 200, headers: {}, data: "" })),
    close: vi.fn(),
  };
}
