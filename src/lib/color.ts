export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// Returns a deterministic color from a fixed palette for a given key string.
// Useful for assigning stable colors to named entities (services, users, etc.).
export function colorForKey(key: string, palette: string[]): string {
  if (palette.length === 0) return "inherit";
  return palette[hashStr(key) % palette.length];
}
