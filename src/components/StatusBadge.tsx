import { Label, type LabelProps } from "@patternfly/react-core";

export interface StatusBadgeConfig {
  color: LabelProps["color"];
  label: string;
}

interface Props<T extends string> {
  status: T;
  config: Record<string, StatusBadgeConfig>;
  fallback?: StatusBadgeConfig;
  isCompact?: boolean;
}

export function StatusBadge<T extends string>({ status, config, fallback, isCompact }: Props<T>) {
  const entry = config[status] ?? fallback ?? { color: "grey", label: status };
  return <Label color={entry.color} isCompact={isCompact}>{entry.label}</Label>;
}
