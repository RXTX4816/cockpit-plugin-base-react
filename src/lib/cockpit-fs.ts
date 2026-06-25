/**
 * Reads a file via the Cockpit file API.
 * Returns `null` if the file does not exist (ENOENT) rather than throwing.
 *
 * @param path      - Absolute path to the file.
 * @param superuser - Optional superuser escalation: `"try"` or `"require"`.
 */
export async function readFile(
  path: string,
  superuser?: "try" | "require",
): Promise<string | null> {
  const content = await cockpit.file(path, superuser ? { superuser } : undefined).read() as string | null;
  return content;
}

/**
 * Writes content to a file via the Cockpit file API.
 *
 * @param path      - Absolute path to the file.
 * @param content   - UTF-8 string content to write.
 * @param superuser - Optional superuser escalation: `"try"` or `"require"`.
 */
export async function writeFile(
  path: string,
  content: string,
  superuser?: "try" | "require",
): Promise<void> {
  await cockpit.file(path, superuser ? { superuser } : undefined).replace(content);
}
