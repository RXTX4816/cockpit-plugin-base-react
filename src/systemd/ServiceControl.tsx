import { useState, type ReactNode } from "react";
import { Button, Flex, FlexItem, Spinner } from "@patternfly/react-core";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/ToastProvider";
import { startService, stopService, restartService, reloadService } from "./api";
import type { ServiceStatus } from "./types";

type PendingAction = "start" | "stop" | "restart" | "reload";

/**
 * Overrides for all user-visible strings in {@link ServiceControl}.
 * Every field is optional — unset fields fall back to English defaults.
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

const DEFAULTS: Required<ServiceControlLabels> = {
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
}

/**
 * A row of Start / Stop / Restart / Reload buttons for a systemd unit.
 *
 * Each action opens a `ConfirmDialog` before executing. Errors are shown
 * both inline in the dialog and via the nearest `ToastProvider`.
 *
 * Pair with `useServiceStatus` for reactive status updates.
 */
export function ServiceControl({ unit, status, loading = false, onRefresh, statusBadge, labels }: Props) {
  const toast = useToast();
  const l = { ...DEFAULTS, ...labels };
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
