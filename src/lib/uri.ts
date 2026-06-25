export interface HostPort {
  host: string;
  port: number;
}

const DEFAULT_PORTS: Record<string, number> = { http: 80, https: 443 };

/**
 * Parses `"host:port"` or a bare `"port"` string.
 * Returns `null` for invalid input.
 *
 * @example
 * parseHostPort("localhost:8080") // { host: "localhost", port: 8080 }
 * parseHostPort("8080")           // { host: "", port: 8080 }
 * parseHostPort("bad")            // null
 */
export function parseHostPort(input: string): HostPort | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon === -1) {
    const port = Number(trimmed);
    if (!isValidPort(port)) return null;
    return { host: "", port };
  }

  const host = trimmed.slice(0, lastColon);
  const port = Number(trimmed.slice(lastColon + 1));
  if (!isValidPort(port)) return null;
  return { host, port };
}

/**
 * Returns `true` when the value is a valid TCP port number (1–65535).
 */
export function isValidPort(port: number | string): boolean {
  const n = Number(port);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

/**
 * Builds a URL string from parts, omitting the port when it is the
 * default for the given scheme.
 *
 * @example
 * buildUrl({ scheme: "https", host: "localhost", port: 443, path: "/api" })
 * // "https://localhost/api"
 * buildUrl({ scheme: "http", host: "localhost", port: 8080 })
 * // "http://localhost:8080"
 */
export function buildUrl({
  scheme,
  host,
  port,
  path = "",
}: {
  scheme: string;
  host: string;
  port: number;
  path?: string;
}): string {
  const isDefault = DEFAULT_PORTS[scheme] === port;
  const authority = isDefault ? host : `${host}:${port}`;
  return `${scheme}://${authority}${path || ""}`;
}

/**
 * Maps a local port number to a URL accessible from the Cockpit browser frame.
 *
 * @example
 * portToUrl(8080)           // "http://localhost:8080"
 * portToUrl(8443, "https")  // "https://localhost:8443"
 */
export function portToUrl(port: number, scheme = "http"): string {
  return buildUrl({ scheme, host: "localhost", port });
}
