import { useState, useEffect, useRef, useCallback, type CSSProperties, type ReactNode } from "react";
import {
  Alert,
  AlertActionCloseButton,
  Button,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
} from "@patternfly/react-core";
import { highlightWithSearch } from "../lib/logParser";

interface Props {
  /** Log lines to display. Each string becomes one highlighted line. */
  lines: string[];
  /** When `true`, shows a spinner instead of log content on first load. */
  loading?: boolean;
  /** If set, renders a danger alert at the top. */
  error?: string | null;
  /** When provided, adds a refresh button. */
  onRefresh?: () => void;
  /** When `true`, log output is frozen (auto-scroll stops). */
  paused?: boolean;
  /** Called when the user clicks the Pause button. */
  onPause?: () => void;
  /** Called when the user clicks the Resume button. */
  onResume?: () => void;
  /**
   * Suggested download file name (without extension). When provided a download
   * button is shown. First tries the File System Access API; falls back to
   * saving via cockpit to ~/Downloads/ (Firefox/Cockpit-iframe fallback).
   */
  downloadFileName?: string;
  /** Pre-fills and drives the search box externally. */
  filterValue?: string;
  /** Called whenever the search input changes. */
  onFilterChange?: (value: string) => void;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;
  /** Message shown when `lines` is empty and not loading. */
  emptyMessage?: string;
  /** Message shown when the filter matches nothing. */
  noMatchesMessage?: string;
  /** Title of the danger alert when `error` is set. */
  errorTitle?: string;
  /** `aria-label` for the refresh button. */
  refreshAriaLabel?: string;
}

const VIEWER_STYLE: CSSProperties = {
  overflowY: "auto",
  maxHeight: "60vh",
  background: "#0d1117",
  borderRadius: "var(--pf-v6-global--BorderRadius--sm, 4px)",
  padding: "0.4rem 0",
  fontFamily: "var(--pf-t--global--font--family--mono, monospace)",
  fontSize: "0.78rem",
  lineHeight: 1.6,
};

const LINE_BASE: CSSProperties = {
  padding: "0.05rem 0.75rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  color: "#e6edf3",
};

function levelBg(line: string): string {
  if (/\b(FATAL|CRITICAL|ERROR|ERR)\b/i.test(line)) return "rgba(248,81,73,0.10)";
  if (/\bWARN(ING)?\b/i.test(line)) return "rgba(227,179,65,0.08)";
  return "";
}

function LogLine({ line, search, isRegex, index }: {
  line: string; search: string; isRegex: boolean; index: number;
}): ReactNode {
  const bg = levelBg(line) || (index % 2 !== 0 ? "rgba(255,255,255,0.015)" : "transparent");
  return (
    <div style={{ ...LINE_BASE, background: bg }}>
      {highlightWithSearch(line, search, isRegex)}
    </div>
  );
}

export function LogViewer({
  lines,
  loading = false,
  error,
  onRefresh,
  paused = false,
  onPause,
  onResume,
  downloadFileName,
  filterValue,
  onFilterChange,
  searchPlaceholder = "Search logs…",
  emptyMessage = "No log entries.",
  noMatchesMessage = "No matching entries.",
  errorTitle = "Failed to load logs",
  refreshAriaLabel = "Refresh",
}: Props) {
  const [internalSearch, setInternalSearch] = useState(filterValue ?? "");
  const [isRegex, setIsRegex] = useState(false);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filterValue !== undefined) setInternalSearch(filterValue);
  }, [filterValue]);

  const search = filterValue !== undefined ? filterValue : internalSearch;

  const setSearch = useCallback((v: string) => {
    if (onFilterChange) onFilterChange(v);
    else setInternalSearch(v);
  }, [onFilterChange]);

  useEffect(() => {
    if (!paused && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, paused]);

  const scrollToTop = () => { if (logRef.current) logRef.current.scrollTop = 0; };
  const scrollToBottom = () => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; };

  const filtered = lines.filter(l => {
    if (!search) return true;
    try {
      return isRegex ? new RegExp(search, "i").test(l) : l.toLowerCase().includes(search.toLowerCase());
    } catch { return true; }
  });

  const handleDownload = useCallback(async () => {
    if (!downloadFileName) return;
    const text = filtered.join("\n");
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as Window & {
          showSaveFilePicker(o: object): Promise<{
            createWritable(): Promise<{ write(s: string): Promise<void>; close(): Promise<void> }>;
          }>;
        }).showSaveFilePicker({
          suggestedName: `${downloadFileName}.txt`,
          types: [{ description: "Text files", accept: { "text/plain": [".txt"] } }],
        });
        const w = await handle.createWritable();
        await w.write(text);
        await w.close();
        return;
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        // SecurityError in Cockpit's iframe — fall through
      }
    }
    try {
      const user = await cockpit.user();
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const savePath = `${user.home}/Downloads/${downloadFileName}-${ts}.txt`;
      await cockpit.spawn(["mkdir", "-p", "--", `${user.home}/Downloads`], { err: "message" });
      await cockpit.file(savePath).replace(text);
      setDownloadNote(savePath);
    } catch (err) {
      setDownloadError((err as { message?: string })?.message ?? String(err));
    }
  }, [filtered, downloadFileName]);

  const lineCount = filtered.length !== lines.length
    ? `${filtered.length} / ${lines.length}`
    : String(lines.length);

  const hasPauseControl = onPause !== undefined || onResume !== undefined;

  const regexBtnStyle: CSSProperties = {
    height: "var(--pf-t--global--control--size--base, 36px)",
    padding: "0 0.5rem",
    fontFamily: "var(--pf-t--global--font--family--mono, monospace)",
    fontSize: "0.8rem",
    fontWeight: 600,
    border: "1px solid var(--pf-t--global--border--color--default)",
    borderRadius: "var(--pf-t--global--border--radius--100, 4px)",
    cursor: "pointer",
    transition: "background 120ms ease, color 120ms ease",
    background: isRegex
      ? "var(--pf-t--global--color--brand--default, #06c)"
      : "var(--pf-t--global--background--color--primary--default)",
    color: isRegex ? "#fff" : "var(--pf-t--global--text--color--subtle)",
    borderColor: isRegex ? "var(--pf-t--global--color--brand--default, #06c)" : undefined,
  };

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert
            variant="danger"
            title={errorTitle}
            actionLinks={onRefresh && <Button variant="link" onClick={onRefresh}>Retry</Button>}
          >
            {error}
          </Alert>
        </StackItem>
      )}
      {downloadNote && (
        <StackItem>
          <Alert variant="info" isInline title={`Saved to ${downloadNote}`}
            actionClose={<AlertActionCloseButton onClose={() => setDownloadNote(null)} />}
          />
        </StackItem>
      )}
      {downloadError && (
        <StackItem>
          <Alert variant="danger" isInline title={downloadError}
            actionClose={<AlertActionCloseButton onClose={() => setDownloadError(null)} />}
          />
        </StackItem>
      )}

      <StackItem>
        <Toolbar style={{ paddingInline: 0 }}>
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <SearchInput
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(_e, v) => setSearch(v)}
                    onClear={() => setSearch("")}
                    style={{ width: 220 }}
                  />
                  <button type="button" aria-label="Toggle regex" aria-pressed={isRegex}
                    title="Toggle regex filter" onClick={() => setIsRegex(r => !r)}
                    style={regexBtnStyle}
                  >.*</button>
                </div>
              </ToolbarItem>
              <ToolbarItem>
                <span style={{ fontSize: "0.75rem", color: "var(--pf-v6-global--Color--200)" }}>
                  {lineCount} lines
                </span>
              </ToolbarItem>
            </ToolbarGroup>

            <ToolbarGroup variant="action-group-plain" align={{ default: "alignEnd" }}>
              <ToolbarItem>
                <Button variant="plain" size="sm" onClick={scrollToTop} aria-label="Jump to top" title="Jump to top">⇑</Button>
              </ToolbarItem>
              <ToolbarItem>
                <Button variant="plain" size="sm" onClick={scrollToBottom} aria-label="Jump to bottom" title="Jump to bottom">⇓</Button>
              </ToolbarItem>
              {hasPauseControl && (
                <ToolbarItem>
                  {paused
                    ? <Button variant="primary" size="sm" onClick={onResume}>▶ Resume</Button>
                    : <Button variant="secondary" size="sm" onClick={onPause}>⏸ Pause</Button>
                  }
                </ToolbarItem>
              )}
              {downloadFileName && filtered.length > 0 && (
                <ToolbarItem>
                  <Button variant="plain" size="sm" onClick={() => void handleDownload()} aria-label="Download logs" title="Download logs">⬇</Button>
                </ToolbarItem>
              )}
              {onRefresh && (
                <ToolbarItem>
                  <Button variant="plain" size="sm" onClick={onRefresh} aria-label={refreshAriaLabel} title={refreshAriaLabel}>↺</Button>
                </ToolbarItem>
              )}
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </StackItem>

      <StackItem isFilled>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--pf-v6-global--Color--200)" }}>
            {lines.length === 0 ? emptyMessage : noMatchesMessage}
          </p>
        ) : (
          <div ref={logRef} style={VIEWER_STYLE}>
            {filtered.map((line, i) => (
              <LogLine key={i} line={line} search={search} isRegex={isRegex} index={i} />
            ))}
          </div>
        )}
      </StackItem>
    </Stack>
  );
}
