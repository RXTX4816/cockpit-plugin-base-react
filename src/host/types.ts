/** Cockpit's superuser bridge: `"try"` runs unprivileged when it is not available, `"require"` fails instead. */
export type Superuser = "try" | "require";

export interface RunOptions {
  /** Escalate through Cockpit's superuser bridge. Omit to run as the logged-in user. */
  superuser?: Superuser;
  /** Extra `NAME=value` environment entries. */
  environ?: string[];
  /** Written to the command's stdin, which is then closed. Use it for secrets: argv is visible in `ps`. */
  stdin?: string;
  /** Receives output as it arrives. The returned promise still resolves with all of it. */
  onOutput?: (chunk: string) => void;
  /**
   * What happens to stderr. `"message"` (default) puts it in the {@link HostError} message,
   * `"ignore"` drops it, `"out"` merges it into the output.
   */
  stderr?: "message" | "ignore" | "out";
}

/** A running command: await it for the output, call `close()` to cancel it. */
export interface HostProcess extends Promise<string> {
  close(): void;
}

export interface FileOptions {
  superuser?: Superuser;
}

/**
 * Everything a plugin does to the machine Cockpit is connected to.
 *
 * The seam: {@link createCockpitHost} is the real adapter, `FakeHost` (from
 * `@rxtx4816/cockpit-plugin-base-react/testing/host`) is the in-memory one.
 */
export interface Host {
  /**
   * Runs `argv` (no shell) and resolves with its stdout.
   * Rejects with a {@link HostError} when it exits non-zero, cannot start, or is closed.
   */
  run(argv: string[], options?: RunOptions): HostProcess;
  /** The file's content, or `null` when it does not exist. */
  readFile(path: string, options?: FileOptions): Promise<string | null>;
  /** Replaces the file's content, creating it when missing. */
  writeFile(path: string, content: string, options?: FileOptions): Promise<void>;
}

/** The one error every {@link Host} method rejects with. */
export class HostError extends Error {
  /** The command that failed (empty for file operations). */
  readonly argv: string[];
  /** Exit status when the command ran and exited non-zero. */
  readonly exitStatus?: number;
  /** Cockpit's problem code, e.g. `"not-found"`, `"access-denied"`, `"terminated"`. */
  readonly problem?: string;
  /** Whatever the command printed before it failed. */
  readonly output: string;

  constructor(
    message: string,
    details: { argv?: string[]; exitStatus?: number; problem?: string; output?: string } = {},
  ) {
    super(message);
    this.name = "HostError";
    this.argv = details.argv ?? [];
    this.exitStatus = details.exitStatus;
    this.problem = details.problem;
    this.output = details.output ?? "";
  }
}
