import { getHost, mkdirp, type Host } from "../host";

/**
 * Saves `text` as `<baseName>-<timestamp>.txt` in the user's `~/Downloads`, creating the folder if needed.
 * Resolves with the path it wrote. For when the browser's file picker is not available, as in
 * Cockpit's iframe.
 *
 * @param host - Defaults to the current {@link getHost}.
 */
export async function saveTextToDownloads(text: string, baseName: string, host: Host = getHost()): Promise<string> {
  const user = await cockpit.user();
  const dir = `${user.home}/Downloads`;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const path = `${dir}/${baseName}-${ts}.txt`;
  await mkdirp(host, dir);
  await host.writeFile(path, text);
  return path;
}
