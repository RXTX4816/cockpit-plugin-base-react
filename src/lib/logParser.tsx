import { type ReactNode } from "react";

/**
 * Try to extract a JSON object from a log line.
 * Handles bare JSON lines and lines with a journalctl "unit[pid]: {" prefix.
 */
export function extractJsonPayload(line: string): { prefix: string; obj: Record<string, unknown> } | null {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("{")) {
    try {
      return { prefix: "", obj: JSON.parse(trimmed) as Record<string, unknown> };
    } catch { /* not valid JSON */ }
  }
  const m = line.match(/^(.*?\[\d+\]: )(\{.*)/s);
  if (m) {
    try {
      return { prefix: m[1], obj: JSON.parse(m[2]) as Record<string, unknown> };
    } catch { /* not valid JSON */ }
  }
  return null;
}

// Matches JSON strings (with optional trailing colon = key), numbers, booleans, null.
const JSON_TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false|null)/g;

/** Renders a pretty-printed JSON string with syntax coloring. Does not apply search highlighting. */
export function colorizeJson(json: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  JSON_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JSON_TOKEN_RE.exec(json)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{json.slice(last, m.index)}</span>);
    if (m[1] !== undefined) {
      if (m[2]) {
        // JSON key: "key":
        parts.push(<span key={k++} style={{ color: "var(--log-token-path)" }}>{m[1]}</span>);
        parts.push(<span key={k++}>{m[2]}</span>);
      } else {
        // String value
        parts.push(<span key={k++} style={{ color: "var(--log-token-string)" }}>{m[1]}</span>);
      }
    } else if (m[3] !== undefined) {
      parts.push(<span key={k++} style={{ color: "var(--log-token-2xx)" }}>{m[3]}</span>);
    } else if (m[4] !== undefined) {
      parts.push(
        <span key={k++} style={{ color: m[4] === "null" ? "var(--log-token-trace)" : "var(--log-token-info)" }}>
          {m[4]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < json.length) parts.push(<span key={k++}>{json.slice(last)}</span>);
  return <>{parts}</>;
}

// Token types in priority order; first match wins at each position.
export const TOKEN_RE = new RegExp(
  [
    String.raw`\b(FATAL|CRITICAL|ERROR|ERR|WARN(?:ING)?|INFO|DEBUG|TRACE)\b`,
    String.raw`\b5\d{2}\b`,
    String.raw`\b4\d{2}\b`,
    String.raw`\b[23]\d{2}\b`,
    String.raw`"[^"]*"|'[^']*'`,
    String.raw`(?:\/[\w.\-]+){2,}`,
    String.raw`\b\d{1,3}(?:\.\d{1,3}){3}\b`,
  ].join("|"),
  "gi",
);

export function tokenColor(token: string): string {
  const u = token.toUpperCase();
  if (/^(FATAL|CRITICAL|ERROR|ERR)$/.test(u)) return "var(--log-token-error)";
  if (/^WARN/.test(u)) return "var(--log-token-warn)";
  if (u === "INFO") return "var(--log-token-info)";
  if (u === "DEBUG") return "var(--log-token-debug)";
  if (u === "TRACE") return "var(--log-token-trace)";
  if (/^5\d{2}$/.test(token)) return "var(--log-token-5xx)";
  if (/^4\d{2}$/.test(token)) return "var(--log-token-4xx)";
  if (/^[23]\d{2}$/.test(token)) return "var(--log-token-2xx)";
  if (token.startsWith('"') || token.startsWith("'")) return "var(--log-token-string)";
  if (token.startsWith("/")) return "var(--log-token-path)";
  return "var(--log-token-default)";
}

export function tokenWeight(token: string): string | number {
  const u = token.toUpperCase();
  if (/^(FATAL|CRITICAL|ERROR|ERR|WARN)/.test(u)) return 700;
  return "inherit";
}

/** Renders a log message string with syntax-highlighted tokens as React nodes. */
export function highlightMessage(msg: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(msg)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{msg.slice(last, m.index)}</span>);
    parts.push(
      <span key={k++} style={{ color: tokenColor(m[0]), fontWeight: tokenWeight(m[0]) }}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < msg.length) parts.push(<span key={k++}>{msg.slice(last)}</span>);
  return parts.length ? <>{parts}</> : msg;
}

/** Renders a log message with search-term highlighting layered on top of syntax coloring. */
export function highlightWithSearch(msg: string, term: string, isRegex: boolean): ReactNode {
  if (!term) return highlightMessage(msg);
  try {
    const re = isRegex
      ? new RegExp(term, "gi")
      : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const parts: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(msg)) !== null) {
      if (m.index > last) {
        parts.push(<span key={`pre-${last}`}>{highlightMessage(msg.slice(last, m.index))}</span>);
      }
      parts.push(
        <mark key={`match-${m.index}`} style={{ background: "rgba(255,213,0,0.35)", color: "inherit", borderRadius: 2 }}>
          {m[0]}
        </mark>,
      );
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < msg.length) parts.push(<span key={`tail-${last}`}>{highlightMessage(msg.slice(last))}</span>);
    return parts.length > 0 ? parts : highlightMessage(msg);
  } catch {
    return highlightMessage(msg);
  }
}
