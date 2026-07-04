import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";

interface Props {
  url: string;
  onClose: () => void;
  labels?: {
    title?: string;
    ariaLabel?: string;
    warningTitle?: string;
    continueButton?: string;
    cancelButton?: string;
  };
}

export function ExternalLinkModal({ url, onClose, labels = {} }: Props) {
  const { t, i18n } = useTranslation();
  const tf = (key: string, fallback: string) => (i18n.isInitialized ? t(key, fallback) : fallback);

  const {
    title = tf("externalLinkModal.title", "Open external link"),
    ariaLabel = tf("externalLinkModal.ariaLabel", "External link confirmation"),
    warningTitle = tf("externalLinkModal.warningTitle", "You are about to leave this application"),
    continueButton = tf("externalLinkModal.continueButton", "Continue"),
    cancelButton = tf("common.cancel", "Cancel"),
  } = labels;

  function handleContinue() {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Modal isOpen onClose={onClose} variant="small" aria-label={ariaLabel}>
      <ModalHeader title={title} />
      <ModalBody>
        <Alert variant="warning" isInline isPlain title={warningTitle} component="h2" />
        <p style={{ marginTop: "var(--pf-t--global--spacer--md)", wordBreak: "break-all" }}>
          {url}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleContinue}>
          {continueButton}
        </Button>
        <Button variant="link" onClick={onClose}>
          {cancelButton}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
