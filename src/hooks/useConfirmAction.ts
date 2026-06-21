import { useState, useCallback } from "react";

export type ConfirmStep = "idle" | "confirming" | "submitting";

export interface ConfirmActionState {
  step: ConfirmStep;
  error: string | null;
  confirm: () => void;
  cancel: () => void;
  submit: (action: () => Promise<void>) => Promise<void>;
  clearError: () => void;
}

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
