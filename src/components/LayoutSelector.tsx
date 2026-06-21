import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button, Tooltip, ToggleGroup, ToggleGroupItem } from "@patternfly/react-core";
import { SlidersHIcon } from "@patternfly/react-icons";
import "./LayoutSelector.css";

export interface LayoutOption<T extends string = string> {
  key: T;
  icon: ReactNode;
  label: string;
}

interface Props<T extends string = string> {
  layout: T;
  onLayoutChange: (layout: T) => void;
  layouts: LayoutOption<T>[];
  ariaLabel?: string;
}

export function LayoutSelector<T extends string>({
  layout,
  onLayoutChange,
  layouts,
  ariaLabel = "Change layout",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = layouts.find(l => l.key === layout);

  return (
    <div ref={containerRef} className={`ls-wrap${open ? " ls-wrap--open" : ""}`}>
      <Tooltip content={`Layout: ${current?.label ?? layout}`}>
        <Button
          variant="plain"
          size="sm"
          onClick={() => setOpen(o => !o)}
          aria-label={ariaLabel}
          className={`ls-trigger${open ? " ls-trigger--active" : ""}`}
        >
          {current?.icon ?? <SlidersHIcon />}
        </Button>
      </Tooltip>
      {open && (
        <ToggleGroup aria-label="Layout" isCompact className="ls-toggle">
          {layouts.map(({ key, icon, label }) => (
            <Tooltip key={key} content={label}>
              <ToggleGroupItem
                icon={icon}
                isSelected={layout === key}
                onChange={() => { onLayoutChange(key); setOpen(false); }}
                aria-label={label}
              />
            </Tooltip>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
}
