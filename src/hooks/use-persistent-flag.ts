"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();

/**
 * An on/off preference remembered in this browser (localStorage). Reads are
 * SSR-safe (off on the server) and every component using the same key stays
 * in sync.
 */
export function usePersistentFlag(key: string) {
  const value = useSyncExternalStore(
    (notify) => {
      const set = listeners.get(key) ?? new Set();
      set.add(notify);
      listeners.set(key, set);
      return () => set.delete(notify);
    },
    () => window.localStorage.getItem(key) === "1",
    () => false,
  );
  const setValue = useCallback(
    (next: boolean) => {
      window.localStorage.setItem(key, next ? "1" : "0");
      listeners.get(key)?.forEach((l) => l());
    },
    [key],
  );
  return [value, setValue] as const;
}

/** True when a browser capability check passes (false during SSR). */
export function useBrowserSupport(check: () => boolean) {
  return useSyncExternalStore(
    () => () => {},
    check,
    () => false,
  );
}
