import { useState, type ReactNode } from "react";
import { Button, Flex, FlexItem, Spinner } from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/ToastProvider";
import { startService, stopService, restartService, reloadService } from "./api";
import type { ServiceStatus } from "./types";

type PendingAction = "start" | "stop" | "restart" | "reload";

/**
 * Overrides for all user-visible strings in {@link ServiceControl}.
 * Every field is optional — unset fields fall back to the active locale's base
 * translation (see `baseTranslations` in `../i18n`), or an English literal if
 * i18next isn't initialized.
 */
export interface ServiceControlLabels {
  /** Start button label. */
  start?: string;
  /** Stop button label. */
  stop?: string;
  /** Restart button label. */
  restart?: string;
  /** Reload button label. */
  reload?: string;
  /** Cancel button label in the confirmation dialog. */
  cancel?: string;
  /** Confirm button label in the confirmation dialog. */
  confirmAction?: string;
  confirmStartTitle?: string;
  confirmStartBody?: string;
  confirmStopTitle?: string;
  confirmStopBody?: string;
  confirmRestartTitle?: string;
  confirmRestartBody?: string;
  confirmReloadTitle?: string;
  confirmReloadBody?: string;
  successStart?: string;
  successStop?: string;
  successRestart?: string;
  successReload?: string;
}

// English literals used only when i18next isn't initialized at all (unit-test
// safety) — otherwise each key resolves via t(key, fallback) below, which also
// covers the "initialized but key missing" case (consumer hasn't adopted
// baseTranslations yet).
const ENGLISH_FALLBACKS: Required<ServiceControlLabels> = {
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  reload: "Reload",
  cancel: "Cancel",
  confirmAction: "Confirm",
  confirmStartTitle: "Start service?",
  confirmStartBody: "The service will be started.",
  confirmStopTitle: "Stop service?",
  confirmStopBody: "The service will be stopped.",
  confirmRestartTitle: "Restart service?",
  confirmRestartBody: "The service will be restarted.",
  confirmReloadTitle: "Reload service?",
  confirmReloadBody: "The service configuration will be reloaded.",
  successStart: "Service started",
  successStop: "Service stopped",
  successRestart: "Service restarted",
  successReload: "Configuration reloaded",
};

interface Props {
  /** The systemd unit name (e.g. `"nginx.service"`). */
  unit: string;
  /** Current unit status — drives which buttons are enabled. */
  status: ServiceStatus;
  /** When `true`, shows a spinner in place of the status badge. */
  loading?: boolean;
  /** Called after a successful action so the parent can re-poll status. */
  onRefresh?: () => void;
  /** Optional status badge rendered to the left of the action buttons. */
  statusBadge?: ReactNode;
  /** Override any user-visible string. See {@link ServiceControlLabels}. */
  labels?: ServiceControlLabels;
  /** Extra content rendered at the far right of the button row (e.g. Backup / Restore buttons). */
  extraActions?: ReactNode;
}

/**
 * A row of Start / Stop / Restart / Reload buttons for a systemd unit.
 *
 * Each action opens a `ConfirmDialog` before executing. Errors are shown
 * both inline in the dialog and via the nearest `ToastProvider`.
 *
 * Pair with `useServiceStatus` for reactive status updates.
 */
export function ServiceControl({ unit, status, loading = false, onRefresh, statusBadge, labels, extraActions }: Props) {
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const tf = (key: string, fallback: string) => (i18n.isInitialized ? t(key, fallback) : fallback);
  const i18nDefaults: Required<ServiceControlLabels> = {
    start: tf("service.start", ENGLISH_FALLBACKS.start),
    stop: tf("service.stop", ENGLISH_FALLBACKS.stop),
    restart: tf("service.restart", ENGLISH_FALLBACKS.restart),
    reload: tf("service.reload", ENGLISH_FALLBACKS.reload),
    cancel: tf("common.cancel", ENGLISH_FALLBACKS.cancel),
    confirmAction: tf("service.confirm_action", ENGLISH_FALLBACKS.confirmAction),
    confirmStartTitle: tf("service.confirm_start_title", ENGLISH_FALLBACKS.confirmStartTitle),
    confirmStartBody: tf("service.confirm_start_body", ENGLISH_FALLBACKS.confirmStartBody),
    confirmStopTitle: tf("service.confirm_stop_title", ENGLISH_FALLBACKS.confirmStopTitle),
    confirmStopBody: tf("service.confirm_stop_body", ENGLISH_FALLBACKS.confirmStopBody),
    confirmRestartTitle: tf("service.confirm_restart_title", ENGLISH_FALLBACKS.confirmRestartTitle),
    confirmRestartBody: tf("service.confirm_restart_body", ENGLISH_FALLBACKS.confirmRestartBody),
    confirmReloadTitle: tf("service.confirm_reload_title", ENGLISH_FALLBACKS.confirmReloadTitle),
    confirmReloadBody: tf("service.confirm_reload_body", ENGLISH_FALLBACKS.confirmReloadBody),
    successStart: tf("toast.service_started", ENGLISH_FALLBACKS.successStart),
    successStop: tf("toast.service_stopped", ENGLISH_FALLBACKS.successStop),
    successRestart: tf("toast.service_restarted", ENGLISH_FALLBACKS.successRestart),
    successReload: tf("toast.service_reloaded", ENGLISH_FALLBACKS.successReload),
  };
  const l = { ...i18nDefaults, ...labels };
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const ACTION_FN: Record<PendingAction, () => Promise<void>> = {
    start: () => startService(unit),
    stop: () => stopService(unit),
    restart: () => restartService(unit),
    reload: () => reloadService(unit),
  };

  const successLabel: Record<PendingAction, string> = {
    start: l.successStart,
    stop: l.successStop,
    restart: l.successRestart,
    reload: l.successReload,
  };

  async function runAction() {
    if (!pendingAction) return;
    setBusy(true);
    setActionError(null);
    try {
      await ACTION_FN[pendingAction]();
      toast.success(successLabel[pendingAction]);
      setPendingAction(null);
      onRefresh?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionError(msg);
      toast.error(`${pendingAction} failed`, msg);
    } finally {
      setBusy(false);
    }
  }

  function openAction(action: PendingAction) {
    setActionError(null);
    setPendingAction(action);
  }

  const isRunning = status === "active";
  const notInstalled = status === "not-installed";
  const isDisabledBase = busy || loading || notInstalled;

  const confirmTitle: Record<PendingAction, string> = {
    start: l.confirmStartTitle,
    stop: l.confirmStopTitle,
    restart: l.confirmRestartTitle,
    reload: l.confirmReloadTitle,
  };

  const confirmBody: Record<PendingAction, string> = {
    start: l.confirmStartBody,
    stop: l.confirmStopBody,
    restart: l.confirmRestartBody,
    reload: l.confirmReloadBody,
  };

  const isDanger = pendingAction === "stop" || pendingAction === "restart";

  return (
    <>
      <Flex alignItems={{ default: "alignItemsCenter" }} gap={{ default: "gapSm" }}>
        {(loading || statusBadge) && (
          <FlexItem>
            {loading ? <Spinner size="sm" /> : statusBadge}
          </FlexItem>
        )}
        <FlexItem>
          <Button
            variant="primary"
            size="sm"
            isDisabled={isDisabledBase || isRunning}
            onClick={() => openAction("start")}
          >
            {l.start}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={isDisabledBase || !isRunning}
            onClick={() => openAction("stop")}
          >
            {l.stop}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={isDisabledBase || !isRunning}
            onClick={() => openAction("restart")}
          >
            {l.restart}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="plain"
            size="sm"
            isDisabled={isDisabledBase || !isRunning}
            onClick={() => openAction("reload")}
          >
            {l.reload}
          </Button>
        </FlexItem>
        {extraActions && (
          <FlexItem align={{ default: "alignRight" }}>
            {extraActions}
          </FlexItem>
        )}
      </Flex>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={pendingAction ? confirmTitle[pendingAction] : ""}
        body={pendingAction ? confirmBody[pendingAction] : undefined}
        confirmLabel={l.confirmAction}
        cancelLabel={l.cancel}
        variant={isDanger ? "danger" : "primary"}
        loading={busy}
        error={actionError}
        onConfirm={() => void runAction()}
        onClose={() => { if (!busy) { setPendingAction(null); setActionError(null); } }}
      />
    </>
  );
}
