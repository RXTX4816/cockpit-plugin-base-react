import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import type { ReactNode } from "react";

interface Props {
  isOpen: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "primary",
  loading = false,
  error,
  onConfirm,
  onClose,
}: Props) {
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
          {cancelLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
