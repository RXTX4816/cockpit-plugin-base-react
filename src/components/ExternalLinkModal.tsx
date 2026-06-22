import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from "@patternfly/react-core";

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
  const {
    title = "Open external link",
    ariaLabel = "External link confirmation",
    warningTitle = "You are about to leave this application",
    continueButton = "Continue",
    cancelButton = "Cancel",
  } = labels;

  function handleContinue() {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Modal isOpen onClose={onClose} variant="small" aria-label={ariaLabel}>
      <ModalHeader title={title} />
      <ModalBody>
        <Alert variant="warning" isInline isPlain title={warningTitle} />
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
