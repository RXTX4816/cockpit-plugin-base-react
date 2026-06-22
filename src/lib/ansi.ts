// Build ESC at runtime so no-control-regex doesn't flag a literal control char
const ESC = String.fromCharCode(27);
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*[a-zA-Z]`, "g");

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
