import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  /** Controls modal visibility. */
  isOpen: boolean;
  /** Modal heading text. */
  title: string;
  /** Optional body content rendered above the inline error alert. */
  body?: ReactNode;
  /** Label for the primary confirm button. */
  confirmLabel: string;
  /** Label for the cancel button. Defaults to `"Cancel"`. */
  cancelLabel?: string;
  /** Button variant — use `"danger"` for destructive actions. Defaults to `"primary"`. */
  variant?: "primary" | "danger";
  /** When `true`, the confirm button shows a spinner and both buttons are disabled. */
  loading?: boolean;
  /** If set, renders an inline danger alert above the footer buttons. */
  error?: string | null;
  /** Called when the user clicks the confirm button. */
  onConfirm: () => void;
  /** Called when the user clicks cancel or closes the modal. */
  onClose: () => void;
}

/**
 * A PatternFly `Modal` wired up for a single confirm/cancel action.
 *
 * Pair with `useConfirmAction` to manage the open/close and loading state.
 */
export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  loading = false,
  error,
  onConfirm,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const resolvedCancelLabel = cancelLabel ?? (i18n.isInitialized ? t("common.cancel", "Cancel") : "Cancel");

  return (
    <Modal isOpen={isOpen} variant="small" onClose={onClose} aria-labelledby="cpb-confirm-dialog-title">
      <ModalHeader title={title} labelId="cpb-confirm-dialog-title" />
      <ModalBody>
        {body}
        {error && (
          <Alert
            variant="danger"
            isInline
            title={error}
            component="h2"
            style={{ marginTop: body ? "var(--pf-v6-global--spacer--md)" : undefined }}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant={variant}
          isDisabled={loading}
          isLoading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="link" isDisabled={loading} onClick={onClose}>
          {resolvedCancelLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
