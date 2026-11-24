import {
  HostError,
  setHost,
  type FileOptions,
  type Host,
  type HostProcess,
  type RunOptions,
} from "../host";

/** What a route handler receives. */
export interface RunCall {
  argv: string[];
  options: RunOptions;
  host: FakeHost;
}

type Matcher = string[] | RegExp | ((argv: string[]) => boolean);
type Handler = string | ((call: RunCall) => string | void | Promise<string | void>);

export interface RecordedCall {
  kind: "run" | "read" | "write";
  argv?: string[];
  path?: string;
  content?: string;
  stdin?: string;
  superuser?: "try" | "require";
}

function matches(m: Matcher, argv: string[]): boolean {
  if (typeof m === "function") return m(argv);
  if (m instanceof RegExp) return m.test(argv.join(" "));
  return m.length <= argv.length && m.every((part, i) => argv[i] === part);
}

/**
 * An in-memory {@link Host}: a filesystem you can seed and inspect, the handful of commands
 * plugins use to look after files (`test`, `cat`, `mkdir -p`, `rm`) built in, and routes for
 * everything else. A command with no route rejects, so a test cannot pass by accident
 * against a command it forgot to describe.
 *
 * @example
 * ```ts
 * const host = installFakeHost({ "/etc/caddy/Caddyfile": "{\n}\n" });
 * host.onRun(["caddy", "validate"], () => { throw new Error("bad config"); });
 * await saveSomething();
 * expect(host.files.get("/etc/caddy/Caddyfile")).toBe("{\n}\n");
 * ```
 */
export class FakeHost implements Host {
  /** The filesystem. Mutate it directly to set up or inspect state. */
  readonly files = new Map<string, string>();
  /** Every operation, in order. */
  readonly calls: RecordedCall[] = [];
  private readonly routes: { match: Matcher; handler: Handler }[] = [];
  private readonly rootOwned: string[] = [];
  private admin = true;

  constructor(files: Record<string, string> = {}) {
    for (const [p, c] of Object.entries(files)) this.files.set(p, c);
  }

  /** Answers commands matching `match` (an argv prefix, a regex over the joined argv, or a predicate). Later routes win. */
  onRun(match: Matcher, handler: Handler): this {
    this.routes.unshift({ match, handler });
    return this;
  }

  /** Paths under `prefix` can only be touched with `superuser`. */
  rootOwns(prefix: string): this {
    this.rootOwned.push(prefix);
    return this;
  }

  /** Whether the user has Administrative access: without it `"require"` fails and `"try"` runs unprivileged. */
  setAdmin(allowed: boolean): this {
    this.admin = allowed;
    return this;
  }

  /** The argv of every command run, joined with spaces. */
  get commands(): string[] {
    return this.calls.filter(c => c.kind === "run").map(c => c.argv!.join(" "));
  }

  private denied(path: string, superuser?: "try" | "require"): boolean {
    if (superuser === "require" && !this.admin) return true;
    const escalated = superuser !== undefined && this.admin;
    return !escalated && this.rootOwned.some(p => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
  }

  private deny(path: string, argv: string[] = []): HostError {
    return new HostError(`${path}: Permission denied`, { argv, problem: "access-denied", exitStatus: 1 });
  }

  run(argv: string[], options: RunOptions = {}): HostProcess {
    this.calls.push({ kind: "run", argv, stdin: options.stdin, superuser: options.superuser });
    let closed = false;
    const result = (async (): Promise<string> => {
      await Promise.resolve();
      if (closed) throw new HostError("cancelled", { argv, problem: "terminated" });
      const out = await this.execute(argv, options);
      if (out) options.onOutput?.(out);
      return out;
    })();
    return Object.assign(result, { close() { closed = true; } });
  }

  private async execute(argv: string[], options: RunOptions): Promise<string> {
    const route = this.routes.find(r => matches(r.match, argv));
    if (route) {
      try {
        const out = typeof route.handler === "string" ? route.handler : await route.handler({ argv, options, host: this });
        return out ?? "";
      } catch (e) {
        if (e instanceof HostError) throw e;
        throw new HostError(e instanceof Error ? e.message : String(e), { argv, exitStatus: 1 });
      }
    }
    return this.builtin(argv, options);
  }

  private builtin(argv: string[], options: RunOptions): string {
    const [cmd, ...rest] = argv;
    const paths = rest.filter(a => !a.startsWith("-"));
    const fail = (msg: string) => new HostError(msg, { argv, exitStatus: 1 });
    const guard = (p: string) => { if (this.denied(p, options.superuser)) throw this.deny(p, argv); };
    switch (cmd) {
      case "test": {
        const p = paths[0] ?? "";
        guard(p);
        const isDir = [...this.files.keys()].some(f => f.startsWith(p.endsWith("/") ? p : `${p}/`));
        if (!this.files.has(p) && !isDir) throw fail("");
        return "";
      }
      case "cat": {
        const p = paths[0] ?? "";
        guard(p);
        const c = this.files.get(p);
        if (c === undefined) throw fail(`cat: ${p}: No such file or directory`);
        return c;
      }
      case "mkdir":
        for (const p of paths) guard(p);
        return "";
      case "rm":
        for (const p of paths) { guard(p); this.files.delete(p); }
        return "";
      default:
        throw new HostError(`FakeHost has no route for: ${argv.join(" ")}`, { argv, problem: "not-found", exitStatus: 127 });
    }
  }

  async readFile(path: string, options: FileOptions = {}): Promise<string | null> {
    this.calls.push({ kind: "read", path, superuser: options.superuser });
    if (this.denied(path, options.superuser)) throw this.deny(path);
    return this.files.get(path) ?? null;
  }

  async writeFile(path: string, content: string, options: FileOptions = {}): Promise<void> {
    this.calls.push({ kind: "write", path, content, superuser: options.superuser });
    if (this.denied(path, options.superuser)) throw this.deny(path);
    this.files.set(path, content);
  }
}

/** Creates a {@link FakeHost} and makes it the Host the code under test gets. Pair with `afterEach(resetHost)`. */
export function installFakeHost(files: Record<string, string> = {}): FakeHost {
  const host = new FakeHost(files);
  setHost(host);
  return host;
}
