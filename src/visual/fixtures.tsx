import "@patternfly/react-core/dist/styles/base.css";
import { useEffect, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ToastProvider, useToast } from "../components/ToastProvider";
import { StatusBadge } from "../components/StatusBadge";
import { ServiceStatusBadge } from "../systemd/ServiceStatusBadge";
import type { ServiceStatus } from "../systemd/types";

// Each fixture renders exactly one component state, selected via ?view=<name>,
// so each Playwright test screenshots the whole page without interference
// from other fixtures (important for portal-rendered components like Modal).

function ConfirmDialogFixture() {
  return (
    <ConfirmDialog
      isOpen
      title="Delete item?"
      body={<p>This action cannot be undone.</p>}
      confirmLabel="Delete"
      variant="danger"
      error="Something went wrong while deleting."
      onConfirm={() => {}}
      onClose={() => {}}
    />
  );
}

function FireToasts() {
  const toast = useToast();
  useEffect(() => {
    toast.success("Saved successfully");
    toast.error("Something went wrong", "The server returned a 500 error.");
    toast.warn("Configuration incomplete");
    toast.info("A new version is available");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function ToastsFixture() {
  return (
    <ToastProvider>
      <FireToasts />
    </ToastProvider>
  );
}

function StatusBadgesFixture() {
  const config = {
    active: { color: "green" as const, label: "Running" },
    inactive: { color: "grey" as const, label: "Stopped" },
    failed: { color: "red" as const, label: "Failed" },
  };
  return (
    <div data-testid="fixture-root" style={{ display: "inline-flex", gap: "0.5rem", padding: "1rem" }}>
      <StatusBadge status="active" config={config} />
      <StatusBadge status="inactive" config={config} />
      <StatusBadge status="failed" config={config} />
    </div>
  );
}

function ServiceStatusBadgesFixture() {
  const statuses: ServiceStatus[] = ["active", "inactive", "failed", "not-installed", "unknown"];
  return (
    <div data-testid="fixture-root" style={{ display: "inline-flex", gap: "0.5rem", padding: "1rem" }}>
      {statuses.map(s => <ServiceStatusBadge key={s} status={s} />)}
    </div>
  );
}

const FIXTURES: Record<string, () => ReactElement> = {
  "confirm-dialog": ConfirmDialogFixture,
  toasts: ToastsFixture,
  "status-badges": StatusBadgesFixture,
  "service-status-badges": ServiceStatusBadgesFixture,
};

const viewMatch = /[?&]view=([^&]+)/.exec(window.location.search);
const view = viewMatch ? decodeURIComponent(viewMatch[1]) : "";
const Fixture = FIXTURES[view];

const root = createRoot(document.getElementById("root")!);
if (Fixture) {
  root.render(<Fixture />);
} else {
  root.render(
    <ul>
      {Object.keys(FIXTURES).map(name => <li key={name}>{name}</li>)}
    </ul>,
  );
}
