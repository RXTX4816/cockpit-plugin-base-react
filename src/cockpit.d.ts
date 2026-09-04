// Ambient type declarations for the Cockpit browser global.
// Superset covering cockpit-caddy and cockpit-compose usage patterns.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./css.d.ts" />

declare interface CockpitProcess extends Promise<string> {
  stream(callback: (data: string) => void): CockpitProcess;
  close(problem?: string): void;
  input(data?: string, stream?: boolean): void;
  wait?(): Promise<string>;
}

declare interface CockpitChannel {
  close(): void;
  send(data: string): void;
  addEventListener(event: "message", callback: (event: Event, payload: string) => void): void;
  addEventListener(event: "close", callback: (event: Event, options: { problem?: string; message?: string }) => void): void;
}

declare interface CockpitHttpRequestOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

declare interface CockpitHttpClient {
  get(path: string, params?: Record<string, string>): Promise<string>;
  post(path: string, body: string, headers?: Record<string, string>): Promise<string>;
  request(options: CockpitHttpRequestOptions): Promise<{ status: number; headers: Record<string, string>; data: string }>;
  close(): void;
}

declare interface CockpitUser {
  id: number;
  name: string;
  home: string;
  shell: string;
  groups: string[];
}

declare interface CockpitPermission {
  allowed: boolean | null;
  addEventListener(event: "changed", callback: () => void): void;
  removeEventListener(event: "changed", callback: () => void): void;
  close(): void;
}

declare interface CockpitLocation {
  path: string[];
  options: Record<string, string>;
  href: string;
  go(path: string[], options?: Record<string, string>): void;
  replace(path: string[], options?: Record<string, string>): void;
  toString(): string;
  addEventListener(event: "changed", callback: () => void): void;
  removeEventListener(event: "changed", callback: () => void): void;
}

declare interface CockpitTransport {
  host: string;
  csrf_token: string;
  origin: string;
  application: string;
  wait(callback: () => void): void;
  close(problem?: string): void;
  addEventListener(event: "control", callback: (event: Event) => void): void;
  addEventListener(event: "closed", callback: (event: Event, problem: string) => void): void;
}

declare interface CockpitDBusProxy {
  wait(): Promise<void>;
  call(method: string, args?: unknown[]): Promise<unknown[]>;
  addEventListener(
    event: "changed",
    callback: (event: Event, changes: Record<string, unknown>) => void,
  ): void;
  [property: string]: unknown;
}

declare interface CockpitDBusClient {
  proxy(iface: string, path?: string): CockpitDBusProxy;
  proxies(iface: string, path?: string): { wait(): Promise<void>; [path: string]: unknown };
  close(): void;
}

declare const cockpit: {
  user(): Promise<CockpitUser>;
  permission(options: { admin: boolean }): CockpitPermission;
  spawn(
    args: string[],
    options?: { superuser?: "try" | "require"; err?: string; environ?: string[] }
  ): CockpitProcess;
  // `endpoint` is either a TCP port/address pair, or a filesystem path starting with "/" to
  // connect to a Unix domain socket (e.g. "/var/run/docker.sock").
  http(
    endpoint: { port?: number; address?: string } | string,
    options?: { superuser?: "try" | "require" }
  ): CockpitHttpClient;
  file(
    path: string,
    options?: { superuser?: "try" | "require"; syntax?: unknown }
  ): {
    read(): Promise<string | null>;
    replace(content: string): Promise<void>;
    watch(callback: (content: string | null) => void): CockpitChannel;
  };
  channel(options: {
    payload: string;
    spawn?: string[];
    pty?: boolean;
    superuser?: "try" | "require";
    [key: string]: unknown;
  }): CockpitChannel;
  location: CockpitLocation;
  transport: CockpitTransport;
  manifests: Record<string, unknown>;
  logout(reload: boolean): void;
  jump(path: string, host?: string): void;
  message(text: string): void;
  dbus(
    service: string,
    options?: { bus?: "session" | "system"; track?: boolean },
  ): CockpitDBusClient;
};
