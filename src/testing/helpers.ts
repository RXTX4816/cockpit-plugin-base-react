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

/**
 * Creates a fake `cockpit.file()` return value.
 *
 * @param content - Initial file content. Pass `null` to simulate a missing file (ENOENT).
 * @param error   - When provided, `read()` and `replace()` reject with this message.
 *
 * @example
 * ```ts
 * vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile("[Unit]\nDescription=test\n"));
 * vi.spyOn(cockpit, "file").mockReturnValue(mockCockpitFile(null)); // missing file
 * ```
 */
export function mockCockpitFile(
  content: string | null,
  error?: string,
): ReturnType<typeof cockpit.file> {
  const read = error
    ? vi.fn(() => Promise.reject(new Error(error)))
    : vi.fn(() => Promise.resolve(content));
  const replace = error
    ? vi.fn(() => Promise.reject(new Error(error)))
    : vi.fn(() => Promise.resolve(undefined));
  const watch = vi.fn(() => ({ close: vi.fn(), send: vi.fn(), addEventListener: vi.fn() }) as CockpitChannel);
  return { read, replace, watch };
}

/**
 * Creates a fake `CockpitPermission` object.
 *
 * @param allowed - Initial permission state (`true`, `false`, or `null` for pending).
 *
 * @example
 * ```ts
 * vi.spyOn(cockpit, "permission").mockReturnValue(mockCockpitPermission(true));
 * ```
 */
export function mockCockpitPermission(allowed: boolean | null): CockpitPermission {
  return {
    allowed,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
  };
}

/**
 * Creates a fake `CockpitUser` object.
 *
 * @param overrides - Partial user fields to override the defaults.
 *
 * @example
 * ```ts
 * vi.spyOn(cockpit, "user").mockResolvedValue(mockCockpitUser({ home: "/home/admin" }));
 * ```
 */
export function mockCockpitUser(overrides: Partial<CockpitUser> = {}): CockpitUser {
  return {
    id: 1000,
    name: "testuser",
    home: "/home/testuser",
    shell: "/bin/bash",
    groups: ["wheel"],
    ...overrides,
  };
}
