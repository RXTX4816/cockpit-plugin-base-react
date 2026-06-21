import { useState, useCallback } from "react";

/** Current phase of the confirmation flow. */
export type ConfirmStep = "idle" | "confirming" | "submitting";

/**
 * State and controls returned by {@link useConfirmAction}.
 */
export interface ConfirmActionState {
  /** Current phase of the flow. */
  step: ConfirmStep;
  /** Error message from the last failed `submit`, or `null`. */
  error: string | null;
  /** Transitions from `idle` → `confirming`, opening the dialog. */
  confirm: () => void;
  /** Transitions back to `idle` and clears the error. */
  cancel: () => void;
  /**
   * Runs `action` while in the `submitting` phase.
   * On success transitions to `idle`; on failure stays in `confirming` with `error` set.
   */
  submit: (action: () => Promise<void>) => Promise<void>;
  /** Clears the error without changing the step. */
  clearError: () => void;
}

/**
 * Manages state for a multi-step confirmation flow: idle → confirming → submitting.
 *
 * Pair with `ConfirmDialog` to wire up the confirmation modal.
 */
export function useConfirmAction(): ConfirmActionState {
  const [step, setStep] = useState<ConfirmStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const confirm = useCallback(() => setStep("confirming"), []);
  const cancel = useCallback(() => { setStep("idle"); setError(null); }, []);
  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(async (action: () => Promise<void>) => {
    setStep("submitting");
    setError(null);
    try {
      await action();
      setStep("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("confirming");
    }
  }, []);

  return { step, error, confirm, cancel, submit, clearError };
}
