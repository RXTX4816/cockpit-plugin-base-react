import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Alert, AlertGroup, AlertActionCloseButton } from "@patternfly/react-core";
import "./ToastProvider.css";

/** Severity level of a toast notification. */
export type ToastVariant = "success" | "danger" | "warning" | "info";

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  body?: string;
}

/**
 * Context value exposed by {@link ToastProvider} and consumed by {@link useToast}.
 */
export interface ToastContextValue {
  /** Adds a toast with an explicit variant. */
  addToast: (variant: ToastVariant, title: string, body?: string) => void;
  /** Shorthand for `addToast("success", ...)`. */
  success: (title: string, body?: string) => void;
  /** Shorthand for `addToast("danger", ...)`. */
  error: (title: string, body?: string) => void;
  /** Shorthand for `addToast("warning", ...)`. */
  warn: (title: string, body?: string) => void;
  /** Shorthand for `addToast("info", ...)`. */
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

/**
 * Provides toast notification state to the component tree.
 *
 * Wrap your app root with `<ToastProvider>` and call {@link useToast} anywhere
 * inside to fire notifications. Toasts auto-dismiss after 5 seconds.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((variant: ToastVariant, title: string, body?: string) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, variant, title, body }]);
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  const success = useCallback((title: string, body?: string) => addToast("success", title, body), [addToast]);
  const error = useCallback((title: string, body?: string) => addToast("danger", title, body), [addToast]);
  const warn = useCallback((title: string, body?: string) => addToast("warning", title, body), [addToast]);
  const info = useCallback((title: string, body?: string) => addToast("info", title, body), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warn, info }}>
      {children}
      <AlertGroup isToast isLiveRegion className="cpb-toast-group">
        {toasts.map(t => (
          <Alert
            key={t.id}
            variant={t.variant}
            title={t.title}
            timeout={AUTO_DISMISS_MS}
            onTimeout={() => dismiss(t.id)}
            actionClose={<AlertActionCloseButton onClose={() => dismiss(t.id)} />}
          >
            {t.body}
          </Alert>
        ))}
      </AlertGroup>
    </ToastContext.Provider>
  );
}

const NOOP_TOAST: ToastContextValue = {
  addToast: () => {},
  success: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
};

/**
 * Returns the nearest {@link ToastProvider}'s context value.
 *
 * Falls back to a no-op implementation when called outside a `ToastProvider`,
 * so it is safe to use in unit tests without a provider wrapper.
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? NOOP_TOAST;
}
