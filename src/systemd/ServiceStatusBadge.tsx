import { useTranslation } from "react-i18next";
import { StatusBadge, type StatusBadgeConfig } from "../components/StatusBadge";
import type { ServiceStatus } from "./types";

/** Overrides for individual status labels. Unset entries fall back to the base i18n translation. */
export type ServiceStatusBadgeLabels = Partial<Record<ServiceStatus, string>>;

const ENGLISH_FALLBACKS: Record<ServiceStatus, string> = {
  active: "Running",
  inactive: "Stopped",
  failed: "Failed",
  "not-installed": "Not installed",
  unknown: "Unknown",
};

const COLORS: Record<ServiceStatus, StatusBadgeConfig["color"]> = {
  active: "green",
  inactive: "grey",
  failed: "red",
  "not-installed": "orange",
  unknown: "grey",
};

const KEYS: Record<ServiceStatus, string> = {
  active: "service.running",
  inactive: "service.stopped",
  failed: "service.failed",
  "not-installed": "service.not_installed",
  unknown: "service.unknown",
};

interface Props {
  /** Current systemd unit status. */
  status: ServiceStatus;
  /** Override individual status labels. See {@link ServiceStatusBadgeLabels}. */
  labels?: ServiceStatusBadgeLabels;
  /** Renders a compact PatternFly `Label`. */
  isCompact?: boolean;
}

/**
 * A {@link StatusBadge} pre-configured with the five systemd unit statuses
 * (`active`, `inactive`, `failed`, `not-installed`, `unknown`), their colors,
 * and translated labels sourced from the base i18n translations.
 *
 * @example
 * ```tsx
 * <ServiceStatusBadge status={status} />
 * ```
 */
export function ServiceStatusBadge({ status, labels, isCompact }: Props) {
  const { t, i18n } = useTranslation();
  const tf = (key: string, fallback: string) => (i18n.isInitialized ? t(key, fallback) : fallback);

  const config: Record<ServiceStatus, StatusBadgeConfig> = {
    active: { color: COLORS.active, label: labels?.active ?? tf(KEYS.active, ENGLISH_FALLBACKS.active) },
    inactive: { color: COLORS.inactive, label: labels?.inactive ?? tf(KEYS.inactive, ENGLISH_FALLBACKS.inactive) },
    failed: { color: COLORS.failed, label: labels?.failed ?? tf(KEYS.failed, ENGLISH_FALLBACKS.failed) },
    "not-installed": {
      color: COLORS["not-installed"],
      label: labels?.["not-installed"] ?? tf(KEYS["not-installed"], ENGLISH_FALLBACKS["not-installed"]),
    },
    unknown: { color: COLORS.unknown, label: labels?.unknown ?? tf(KEYS.unknown, ENGLISH_FALLBACKS.unknown) },
  };

  return <StatusBadge status={status} config={config} isCompact={isCompact} />;
}
