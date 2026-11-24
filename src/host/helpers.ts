import type { FileOptions, Host } from "./types";

/** True when `path` exists (file or directory). */
export async function exists(host: Host, path: string, options: FileOptions = {}): Promise<boolean> {
  try {
    await host.run(["test", "-e", path], { ...options, stderr: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** `mkdir -p`. */
export async function mkdirp(host: Host, path: string, options: FileOptions = {}): Promise<void> {
  await host.run(["mkdir", "-p", "--", path], options);
}

/** `rm -f`: succeeds when the file is already gone. */
export async function remove(host: Host, path: string, options: FileOptions = {}): Promise<void> {
  await host.run(["rm", "-f", "--", path], options);
}
