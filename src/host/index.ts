import { createCockpitHost } from "./cockpitHost";
import type { Host } from "./types";

export { HostError } from "./types";
export type { FileOptions, Host, HostProcess, RunOptions, Superuser } from "./types";
export { createCockpitHost, toHostError } from "./cockpitHost";
export { exists, mkdirp, remove } from "./helpers";

let current: Host | undefined;

/** The Host plugin code talks to. Defaults to the real Cockpit adapter. */
export function getHost(): Host {
  return (current ??= createCockpitHost());
}

/** Swaps the Host, e.g. for a `FakeHost` in tests. */
export function setHost(host: Host): void {
  current = host;
}

/** Back to the real Cockpit adapter. */
export function resetHost(): void {
  current = undefined;
}
