export interface TarCreateResult {
  // Set when tar exited non-zero but the archive was still created (e.g. unreadable files).
  // The archive exists and can be used, but the caller should surface this to the user.
  warning?: string;
}

/**
 * Creates a gzipped tar archive.
 * Handles the common case where tar exits 1 due to unreadable files but the archive was written:
 * in that case resolves with `{ warning }` instead of throwing.
 */
export async function createTarArchive(
  archivePath: string,
  sourceParent: string,
  sourceName: string,
  options?: {
    exclude?: string[];
    // Extra arguments inserted before the source name (e.g. "--wildcards", "--exclude=*.bak").
    // Use this for tar options that don't fit the simple --exclude=<pattern> form.
    extraArgs?: string[];
    superuser?: "require" | "try";
  },
): Promise<TarCreateResult> {
  const args = ["tar", "-czf", archivePath, "-C", sourceParent];
  if (options?.extraArgs) {
    args.push(...options.extraArgs);
  }
  for (const pat of options?.exclude ?? []) {
    args.push(`--exclude=${pat}`);
  }
  args.push(sourceName);

  try {
    await cockpit.spawn(args, { superuser: options?.superuser, err: "message" });
    return {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await cockpit.spawn(["ls", "--", archivePath], {
        superuser: options?.superuser,
        err: "message",
      });
      return { warning: msg };
    } catch {
      throw e;
    }
  }
}

export async function extractTarArchive(
  archivePath: string,
  destDir: string,
  options?: { superuser?: "require" | "try" },
): Promise<void> {
  await cockpit.spawn(
    ["tar", "-xzf", archivePath, "-C", destDir],
    { superuser: options?.superuser, err: "message" },
  );
}

export async function listTarArchives(
  dir: string,
  pattern: string,
  options?: { maxDepth?: number; superuser?: "require" | "try" },
): Promise<string[]> {
  const depth = String(options?.maxDepth ?? 2);
  let out = "";
  try {
    const proc = cockpit.spawn(
      ["find", dir, "-maxdepth", depth, "-name", pattern, "-type", "f"],
      { superuser: options?.superuser, err: "message" },
    );
    proc.stream((d: string) => { out += d; });
    await proc;
  } catch {
    return [];
  }
  return out.trim().split("\n").filter(Boolean).sort().reverse();
}
