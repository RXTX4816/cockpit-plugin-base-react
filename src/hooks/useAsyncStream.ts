import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Accumulated result of a streaming Cockpit process.
 */
export interface AsyncStreamResult {
  /** All output lines received so far, with blank lines and CR stripped. */
  lines: string[];
  /** `true` once the process exits (success or failure). */
  done: boolean;
  /** `true` when the process exited with an error. */
  failed: boolean;
  /** Error message when `failed` is `true`, otherwise empty string. */
  errorMsg: string;
  /** Closes the underlying process and stops accumulating output. */
  cancel: () => void;
}

/**
 * Accumulates line-buffered output from a Cockpit process into a `lines` array.
 *
 * The caller supplies a `startProcess` factory that receives a `launch` callback.
 * Call `launch(proc)` synchronously once the process is ready — this avoids the
 * JS Promise "following" behaviour that occurs when a `CockpitProcess` (which extends
 * `Promise`) is returned from inside a `.then()`.
 *
 * The `deps` array works like `useEffect` deps — the hook tears down and restarts
 * the process whenever any dep changes.
 *
 * @param startProcess - Factory that receives a `launch` callback and must call it with the process.
 * @param deps - Re-run dependencies (same semantics as `useEffect`).
 */
export function useAsyncStream(
  startProcess: (launch: (proc: CockpitProcess) => void) => Promise<void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[],
): AsyncStreamResult {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const bufRef = useRef("");
  const procRef = useRef<CockpitProcess | null>(null);
  // A ref, not an effect-local variable, so cancel() can reach it. `startProcess` is
  // free to await before it calls `launch` (resolving superuser access, say), which
  // leaves a window where there is no process to close yet: cancel() during it used to
  // do nothing at all, and the launch that followed went ahead unsupervised. The user
  // cancelled and the work ran anyway.
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    bufRef.current = "";
    setLines([]);
    setDone(false);
    setFailed(false);
    setErrorMsg("");

    const launch = (proc: CockpitProcess) => {
      if (cancelledRef.current) { proc.close(); return; }
      procRef.current = proc;

      proc.stream(data => {
        bufRef.current += data;
        const parts = bufRef.current.split("\n");
        bufRef.current = parts.pop() ?? "";
        const newLines = parts
          .map(line => line.split("\r").pop() ?? "")
          .filter(line => line.trim() !== "");
        if (newLines.length > 0) {
          setLines(prev => [...prev, ...newLines]);
        }
      });

      proc
        .then(() => {
          if (!cancelledRef.current) { setDone(true); setFailed(false); }
          procRef.current = null;
        })
        .catch((ex: unknown) => {
          if (!cancelledRef.current) {
            setDone(true);
            setFailed(true);
            setErrorMsg(ex instanceof Error ? ex.message : String(ex));
          }
          procRef.current = null;
        });
    };

    startProcess(launch).catch((ex: unknown) => {
      if (!cancelledRef.current) {
        setDone(true);
        setFailed(true);
        setErrorMsg(ex instanceof Error ? ex.message : String(ex));
      }
    });

    return () => {
      cancelledRef.current = true;
      procRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const cancel = useCallback(() => {
    // Set first: if startProcess hasn't called launch yet there is nothing to close,
    // and this flag is what stops the pending launch from starting the work anyway.
    cancelledRef.current = true;
    procRef.current?.close();
    procRef.current = null;
  }, []);

  return { lines, done, failed, errorMsg, cancel };
}
