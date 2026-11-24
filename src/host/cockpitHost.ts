import { HostError, type FileOptions, type Host, type HostProcess, type RunOptions } from "./types";

interface CockpitFailure {
  message?: string;
  problem?: string;
  exit_status?: number | null;
}

/**
 * Turns whatever `cockpit.spawn` / `cockpit.file` rejected with into a {@link HostError}.
 * Cockpit rejects with plain objects whose `message` is often empty, so fall back to the
 * output, then to the exit status or problem code.
 */
export function toHostError(e: unknown, argv: string[], output: string): HostError {
  if (e instanceof HostError) return e;
  const f = (e ?? {}) as CockpitFailure;
  const exitStatus = typeof f.exit_status === "number" ? f.exit_status : undefined;
  const message =
    (typeof f.message === "string" && f.message.trim()) ||
    output.trim() ||
    (exitStatus !== undefined
      ? `${argv[0] ?? "command"} exited with status ${exitStatus}`
      : f.problem
        ? `${argv[0] ?? "operation"} failed: ${f.problem}`
        : e instanceof Error && e.message
          ? e.message
          : "unknown error");
  return new HostError(message, { argv, exitStatus, problem: f.problem, output });
}

function openFile(path: string, options: FileOptions) {
  return options.superuser ? cockpit.file(path, { superuser: options.superuser }) : cockpit.file(path);
}

/** The real adapter: runs everything through the `cockpit` global. */
export function createCockpitHost(): Host {
  return {
    run(argv: string[], options: RunOptions = {}): HostProcess {
      let output = "";
      let inner: CockpitProcess | undefined;
      const result = new Promise<string>((resolve, reject) => {
        try {
          inner = cockpit.spawn(argv, {
            superuser: options.superuser,
            err: options.stderr ?? "message",
            environ: options.environ,
          });
        } catch (e) {
          reject(toHostError(e, argv, ""));
          return;
        }
        inner.stream(chunk => {
          output += chunk;
          options.onOutput?.(chunk);
        });
        if (options.stdin !== undefined) inner.input(options.stdin);
        inner.then(
          out => resolve(typeof out === "string" && out.length >= output.length ? out : output),
          e => reject(toHostError(e, argv, output)),
        );
      });
      return Object.assign(result, {
        close() {
          inner?.close("cancelled");
        },
      });
    },

    async readFile(path: string, options: FileOptions = {}): Promise<string | null> {
      try {
        return (await openFile(path, options).read()) as string | null;
      } catch (e) {
        throw toHostError(e, [], "");
      }
    },

    async writeFile(path: string, content: string, options: FileOptions = {}): Promise<void> {
      try {
        await openFile(path, options).replace(content);
      } catch (e) {
        throw toHostError(e, [], "");
      }
    },
  };
}
