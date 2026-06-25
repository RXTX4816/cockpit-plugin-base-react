import { useReducer, useCallback } from "react";

type InternalState<T extends Record<string, unknown>> = {
  [K in keyof T]?: T[K];
};

type Action<T extends Record<string, unknown>> =
  | { type: "open"; name: keyof T; data: unknown }
  | { type: "close"; name: keyof T }
  | { type: "closeAll"; names: readonly (keyof T)[] }
  | { type: "transition"; from: keyof T; to: keyof T; data?: unknown };

function reducer<T extends Record<string, unknown>>(
  state: InternalState<T>,
  action: Action<T>,
): InternalState<T> {
  switch (action.type) {
    case "open":
      return { ...state, [action.name]: action.data };
    case "close": {
      const next = { ...state };
      delete next[action.name];
      return next;
    }
    case "closeAll": {
      const next = { ...state };
      for (const name of action.names) delete next[name];
      return next;
    }
    case "transition": {
      const next = { ...state };
      const data = action.data !== undefined ? action.data : state[action.from];
      delete next[action.from];
      (next as Record<keyof T, unknown>)[action.to] = data;
      return next;
    }
  }
}

/**
 * Manages open/close state and associated data for a fixed set of named dialogs.
 *
 * @param names - Array of all dialog keys. Used to initialise the state shape.
 *
 * @example
 * ```ts
 * type Modals = { delete: { id: string }; create: undefined };
 * const modals = useDialogState<Modals>(["delete", "create"]);
 *
 * modals.open("delete", { id: "abc" });
 * modals.isOpen("delete");         // true
 * modals.getData("delete");        // { id: "abc" }
 * modals.transition("delete", "create");
 * modals.close("create");
 * ```
 */
export function useDialogState<TDialogs extends Record<string, unknown>>(
  names: readonly (keyof TDialogs)[],
) {
  const [state, dispatch] = useReducer(
    reducer as (s: InternalState<TDialogs>, a: Action<TDialogs>) => InternalState<TDialogs>,
    {} as InternalState<TDialogs>,
  );

  const hasOpen = names.some(n => Object.prototype.hasOwnProperty.call(state, n));

  const open = useCallback(<K extends keyof TDialogs>(name: K, data?: TDialogs[K]) => {
    dispatch({ type: "open", name, data });
  }, []);

  const close = useCallback(<K extends keyof TDialogs>(name: K) => {
    dispatch({ type: "close", name });
  }, []);

  const closeAll = useCallback(() => {
    dispatch({ type: "closeAll", names });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Closes `from` and opens `to` with the provided data (or `from`'s current data
   * if no data is provided). Useful for multi-step confirm → progress flows.
   */
  const transition = useCallback(<F extends keyof TDialogs, To extends keyof TDialogs>(
    from: F,
    to: To,
    data?: TDialogs[To],
  ) => {
    dispatch({ type: "transition", from, to, data });
  }, []);

  const isOpen = <K extends keyof TDialogs>(name: K): boolean =>
    Object.prototype.hasOwnProperty.call(state, name);

  const getData = <K extends keyof TDialogs>(name: K): TDialogs[K] | undefined =>
    state[name] as TDialogs[K] | undefined;

  return { hasOpen, open, close, closeAll, isOpen, getData, transition };
}
