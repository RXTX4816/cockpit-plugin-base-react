import { Label, type LabelProps } from "@patternfly/react-core";

/**
 * Display configuration for a single status value.
 */
export interface StatusBadgeConfig {
  /** PatternFly label color. */
  color: LabelProps["color"];
  /** Human-readable label text. */
  label: string;
}

interface Props<T extends string> {
  /** The current status value to look up in `config`. */
  status: T;
  /** Map of status values to their display configuration. */
  config: Record<string, StatusBadgeConfig>;
  /** Shown when `status` has no entry in `config`. Defaults to a grey label with the raw status string. */
  fallback?: StatusBadgeConfig;
  /** Renders a compact PatternFly `Label`. */
  isCompact?: boolean;
}

/**
 * Renders a PatternFly `Label` whose color and text are driven by a `config` map.
 *
 * @example
 * ```tsx
 * const STATUS_CONFIG: Record<ServiceStatus, StatusBadgeConfig> = {
 *   active:  { color: "green", label: "Active" },
 *   failed:  { color: "red",   label: "Failed" },
 * };
 * <StatusBadge status={serviceStatus} config={STATUS_CONFIG} />
 * ```
 */
export function StatusBadge<T extends string>({ status, config, fallback, isCompact }: Props<T>) {
  const entry = config[status] ?? fallback ?? { color: "grey", label: status };
  return <Label color={entry.color} isCompact={isCompact}>{entry.label}</Label>;
}
