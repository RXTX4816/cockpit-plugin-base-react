import { useState, type Ref } from "react";
import {
  InputGroup,
  InputGroupText,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from "@patternfly/react-core";
import type { MenuToggleElement } from "@patternfly/react-core";

export interface ExternalAddressInputProps {
  /** Current protocol string, e.g. `"https"`. Empty string means no protocol. */
  scheme: string;
  onSchemeChange: (scheme: string) => void;
  /** Hostname / IP for the listener. Empty string means bind all interfaces. */
  host: string;
  onHostChange: (host: string) => void;
  /** Port as a string (to preserve empty/partial input state). */
  port: string;
  onPortChange: (port: string) => void;
  /**
   * Protocol presets shown in the dropdown, e.g. `["http", "https"]`.
   * This component has no built-in protocol list of its own — callers own
   * the preset list for their domain (HTTP schemes, gRPC, etc). Defaults to
   * an empty list.
   */
  builtinSchemes?: string[];
  /**
   * Extra protocol options shown in addition to `builtinSchemes`.
   * Duplicates are ignored.
   */
  suggestedSchemes?: string[];
  isDisabled?: boolean;
  hostValidated?: "default" | "error" | "warning" | "success";
  portValidated?: "default" | "error" | "warning" | "success";
  portPlaceholder?: string;
  hostPlaceholder?: string;
  schemeNoneLabel?: string;
  schemeCustomLabel?: string;
}

/**
 * Two-row input for an external listener address: `[scheme://host]` on row 1,
 * `[:port]` on row 2.
 *
 * Protocol is a dropdown with built-in presets plus any `suggestedSchemes`,
 * and a "Custom" option that reveals a freeform text input for the scheme.
 * Host gets all remaining horizontal space. Port is on its own row.
 */
export function ExternalAddressInput({
  scheme,
  onSchemeChange,
  host,
  onHostChange,
  port,
  onPortChange,
  builtinSchemes = [],
  suggestedSchemes = [],
  isDisabled = false,
  hostValidated = "default",
  portValidated = "default",
  portPlaceholder = "8443",
  hostPlaceholder = "hostname (optional)",
  schemeNoneLabel = "(none)",
  schemeCustomLabel = "Custom…",
}: ExternalAddressInputProps) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [customMode, setCustomMode] = useState(
    () => scheme !== "" && !builtinSchemes.includes(scheme) && !suggestedSchemes.includes(scheme),
  );

  const allPresets = [...builtinSchemes, ...suggestedSchemes.filter(s => !builtinSchemes.includes(s))];

  function handleSelectPick(_: unknown, val: string | number | undefined) {
    const v = String(val ?? "");
    if (v === "__custom__") {
      setCustomMode(true);
      onSchemeChange("");
    } else {
      setCustomMode(false);
      onSchemeChange(v);
    }
    setSelectOpen(false);
  }

  const toggleLabel = customMode ? schemeCustomLabel : scheme || schemeNoneLabel;
  const showSeparator = scheme !== "" || customMode;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {/* Row 1: scheme + host */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", minWidth: 0 }}>
        <Select
          isOpen={selectOpen}
          selected={customMode ? "__custom__" : scheme}
          onSelect={handleSelectPick}
          onOpenChange={setSelectOpen}
          toggle={(ref: Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={ref}
              onClick={() => setSelectOpen(!selectOpen)}
              isExpanded={selectOpen}
              isDisabled={isDisabled}
              style={{ flexShrink: 0, minWidth: 110 }}
            >
              {toggleLabel}
            </MenuToggle>
          )}
        >
          <SelectList>
            <SelectOption value="">{schemeNoneLabel}</SelectOption>
            {allPresets.map(s => (
              <SelectOption key={s} value={s}>{s}</SelectOption>
            ))}
            <SelectOption value="__custom__">{schemeCustomLabel}</SelectOption>
          </SelectList>
        </Select>

        {customMode && (
          <TextInput
            aria-label="Custom protocol"
            value={scheme}
            onChange={(_e, v) => onSchemeChange(v)}
            isDisabled={isDisabled}
            placeholder="proto"
            style={{ width: 80, flexShrink: 0 }}
          />
        )}

        {showSeparator && (
          <InputGroupText style={{ flexShrink: 0 }}>://</InputGroupText>
        )}

        <TextInput
          aria-label="External host"
          value={host}
          onChange={(_e, v) => onHostChange(v)}
          isDisabled={isDisabled}
          validated={hostValidated}
          placeholder={hostPlaceholder}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>

      {/* Row 2: port */}
      <InputGroup style={{ width: "fit-content" }}>
        <InputGroupText>:</InputGroupText>
        <TextInput
          aria-label="External port"
          type="number"
          value={port}
          onChange={(_e, v) => onPortChange(v)}
          isDisabled={isDisabled}
          validated={portValidated}
          placeholder={portPlaceholder}
          style={{ width: 120 }}
        />
      </InputGroup>
    </div>
  );
}
