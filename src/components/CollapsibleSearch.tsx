import { type CSSProperties, useState, useRef, useEffect, useCallback } from "react";
import { Button, SearchInput } from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  "aria-label"?: string;
  /** Width of the expanded input in pixels. Defaults to 220. */
  expandedWidth?: number;
}

export function CollapsibleSearch({
  value,
  onChange,
  onClear,
  placeholder = "Search…",
  "aria-label": ariaLabel = "Search",
  expandedWidth = 220,
}: Props) {
  const [expanded, setExpanded] = useState(value.length > 0);
  const inputRef = useRef<HTMLDivElement>(null);

  // Stay expanded when there's an active search value
  useEffect(() => {
    if (value.length > 0) setExpanded(true);
  }, [value]);

  const collapse = useCallback(() => {
    if (value.length === 0) setExpanded(false);
  }, [value]);

  // Collapse on outside click when empty
  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(e: PointerEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded, collapse]);

  function handleClear() {
    onClear();
    setExpanded(false);
  }

  function handleExpand() {
    setExpanded(true);
    // Focus the inner input after the animation frame
    requestAnimationFrame(() => {
      inputRef.current?.querySelector("input")?.focus();
    });
  }

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    transition: "width 200ms ease, opacity 200ms ease",
    width: expanded ? expandedWidth : 32,
    opacity: expanded ? 1 : 0.6,
  };

  if (!expanded) {
    return (
      <Button
        variant="plain"
        size="sm"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={handleExpand}
      >
        <SearchIcon />
      </Button>
    );
  }

  return (
    <div ref={inputRef} style={containerStyle}>
      <SearchInput
        placeholder={placeholder}
        value={value}
        onChange={(_e, v) => onChange(v)}
        onClear={handleClear}
        style={{ width: expandedWidth }}
        aria-label={ariaLabel}
      />
    </div>
  );
}
