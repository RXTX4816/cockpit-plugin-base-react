import { stripAnsi } from "./ansi";

export interface LineBufferOptions {
  /** Remove ANSI escape sequences from the output. Default `false`. */
  stripAnsi?: boolean;
}

export interface LineBuffer {
  /** Adds a chunk of output and returns the lines it completed (blank ones dropped, carriage-return overwrites resolved). */
  push(chunk: string): string[];
  /** Output received after the last newline: a line that is still being written. */
  readonly pending: string;
  /** Returns {@link pending} and empties the buffer, to hand it to another owner. */
  take(): string;
  /** Empties the buffer. */
  reset(): void;
}

/**
 * Turns the arbitrary chunks a process streams into whole lines.
 *
 * Chunks can end mid-line, so the tail is held back until its newline arrives. A line
 * that was redrawn with `\r` (progress bars) keeps only its last version.
 */
export function createLineBuffer(options: LineBufferOptions = {}): LineBuffer {
  let buf = "";
  return {
    push(chunk: string): string[] {
      buf += options.stripAnsi ? stripAnsi(chunk) : chunk;
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      return parts.map(l => l.split("\r").pop() ?? "").filter(l => l.trim() !== "");
    },
    get pending() { return buf; },
    take() { const p = buf; buf = ""; return p; },
    reset() { buf = ""; },
  };
}

/** Keeps the last `max` lines. */
export function tailLines(lines: string[], max: number): string[] {
  return lines.length > max ? lines.slice(lines.length - max) : lines;
}
