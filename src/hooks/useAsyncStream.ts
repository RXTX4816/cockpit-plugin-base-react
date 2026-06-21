import { useState, useEffect, useRef, useCallback } from "react";

export interface AsyncStreamResult {
  lines: string[];
  done: boolean;
  failed: boolean;
  errorMsg: string;
  cancel: () => void;
}

/**
 * Generic hook for accumulating line-buffered output from a CockpitProcess.
 *
 * The caller supplies a `startProcess` factory that receives a `launch` callback.
 * Call `launch(proc)` synchronously once the process is ready — this avoids the
 * JS Promise "following" behaviour that occurs when a CockpitProcess (which extends
 * Promise) is returned from inside a .then().
 *
 * The `deps` array works like useEffect deps — the hook tears down and restarts
 * the process whenever any dep changes.
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

  useEffect(() => {
    let cancelled = false;
    bufRef.current = "";
    setLines([]);
    setDone(false);
    setFailed(false);
    setErrorMsg("");

    const launch = (proc: CockpitProcess) => {
      if (cancelled) { proc.close(); return; }
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
          if (!cancelled) { setDone(true); setFailed(false); }
          procRef.current = null;
        })
        .catch((ex: unknown) => {
          if (!cancelled) {
            setDone(true);
            setFailed(true);
            setErrorMsg(ex instanceof Error ? ex.message : String(ex));
          }
          procRef.current = null;
        });
    };

    startProcess(launch).catch((ex: unknown) => {
      if (!cancelled) {
        setDone(true);
        setFailed(true);
        setErrorMsg(ex instanceof Error ? ex.message : String(ex));
      }
    });

    return () => {
      cancelled = true;
      procRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const cancel = useCallback(() => {
    procRef.current?.close();
    procRef.current = null;
  }, []);

  return { lines, done, failed, errorMsg, cancel };
}
