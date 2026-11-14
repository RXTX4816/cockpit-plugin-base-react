import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button, ToggleGroup, ToggleGroupItem } from "@patternfly/react-core";
import { Tooltip } from "./Tooltip";
import { SlidersHIcon } from "@patternfly/react-icons";
import { useTranslation } from "react-i18next";
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
  ariaLabel,
}: Props<T>) {
  const { t, i18n } = useTranslation();
  const tf = (key: string, fallback: string, opts?: Record<string, unknown>) =>
    i18n.isInitialized ? t(key, { defaultValue: fallback, ...opts }) : fallback.replace("{{layout}}", String(opts?.layout ?? ""));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  const close = (refocus: boolean) => {
    restoreFocus.current = refocus;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        close(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = layouts.find(l => l.key === layout);

  // Moves focus across the trigger/toggle swap: into the selected option on
  // open, and back to the trigger when closed by keyboard or by picking a
  // layout (not by a click elsewhere, which has already moved focus).
  // Skipped on first render.
  useEffect(() => {
    if (open) {
      containerRef.current?.querySelector<HTMLButtonElement>("button[aria-pressed='true']")?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // While open, the toggle replaces the trigger: showing both looked like one
  // more layout option than there is.
  return (
    <div ref={containerRef} className={`ls-wrap${open ? " ls-wrap--open" : ""}`}>
      {open ? (
        <ToggleGroup
          aria-label={tf("layoutSelector.groupLabel", "Layout")}
          isCompact
          className="ls-toggle"
          onKeyDown={e => { if (e.key === "Escape") close(true); }}
        >
          {layouts.map(({ key, icon, label }) => (
            <Tooltip key={key} content={label}>
              <ToggleGroupItem
                icon={icon}
                isSelected={layout === key}
                onChange={() => { onLayoutChange(key); close(true); }}
                aria-label={label}
              />
            </Tooltip>
          ))}
        </ToggleGroup>
      ) : (
        <Tooltip content={tf("layoutSelector.tooltip", "Layout: {{layout}}", { layout: current?.label ?? layout })}>
          <Button
            ref={triggerRef}
            variant="plain"
            size="sm"
            onClick={() => setOpen(true)}
            aria-label={ariaLabel ?? tf("layoutSelector.ariaLabel", "Change layout")}
            className="ls-trigger"
          >
            {current?.icon ?? <SlidersHIcon />}
          </Button>
        </Tooltip>
      )}
    </div>
  );
}
