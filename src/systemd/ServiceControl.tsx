import { useState, type ReactNode } from "react";
import { Button, Flex, FlexItem, Spinner } from "@patternfly/react-core";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/ToastProvider";
import { startService, stopService, restartService, reloadService } from "./api";
import type { ServiceStatus } from "./types";

type PendingAction = "start" | "stop" | "restart" | "reload";

export interface ServiceControlLabels {
  start?: string;
  stop?: string;
  restart?: string;
  reload?: string;
  cancel?: string;
  confirmAction?: string;
  confirmStartTitle?: string;
  confirmStartBody?: string;
  confirmStopTitle?: string;
  confirmStopBody?: string;
  confirmRestartTitle?: string;
  confirmRestartBody?: string;
  confirmReloadTitle?: string;
  confirmReloadBody?: string;
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
};

interface Props {
  unit: string;
  status: ServiceStatus;
  loading?: boolean;
  onRefresh?: () => void;
  statusBadge?: ReactNode;
  labels?: ServiceControlLabels;
}

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

  async function runAction() {
    if (!pendingAction) return;
    setBusy(true);
    setActionError(null);
    try {
      await ACTION_FN[pendingAction]();
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
            isDisabled={busy || notInstalled || isRunning}
            onClick={() => openAction("start")}
          >
            {l.start}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={busy || notInstalled || !isRunning}
            onClick={() => openAction("stop")}
          >
            {l.stop}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={busy || notInstalled || !isRunning}
            onClick={() => openAction("restart")}
          >
            {l.restart}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="plain"
            size="sm"
            isDisabled={busy || notInstalled || !isRunning}
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
