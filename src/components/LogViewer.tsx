import { useState } from "react";
import {
  Alert,
  Button,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";

interface Props {
  lines: string[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noMatchesMessage?: string;
  errorTitle?: string;
  refreshAriaLabel?: string;
}

export function LogViewer({
  lines,
  loading = false,
  error,
  onRefresh,
  searchPlaceholder = "Search logs…",
  emptyMessage = "No log entries.",
  noMatchesMessage = "No matching entries.",
  errorTitle = "Failed to load logs",
  refreshAriaLabel = "Refresh",
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? lines.filter(l => l.toLowerCase().includes(search.toLowerCase()))
    : lines;

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert
            variant="danger"
            title={errorTitle}
            actionLinks={onRefresh && (
              <Button variant="link" onClick={onRefresh}>Retry</Button>
            )}
          >
            {error}
          </Alert>
        </StackItem>
      )}

      <StackItem>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder={searchPlaceholder}
                value={search}
                onChange={(_e, v) => setSearch(v)}
                onClear={() => setSearch("")}
              />
            </ToolbarItem>
            {onRefresh && (
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Button variant="plain" onClick={onRefresh} aria-label={refreshAriaLabel}>↺</Button>
              </ToolbarItem>
            )}
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
          <pre
            style={{
              fontFamily: "monospace",
              fontSize: "0.8rem",
              overflowX: "auto",
              maxHeight: "60vh",
              overflowY: "auto",
              background: "var(--pf-v6-global--BackgroundColor--dark-100, #1b1d21)",
              color: "var(--pf-v6-global--Color--light-100, #e8e8e8)",
              padding: "1rem",
              borderRadius: "var(--pf-v6-global--BorderRadius--sm, 4px)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {filtered.join("\n")}
          </pre>
        )}
      </StackItem>
    </Stack>
  );
}
