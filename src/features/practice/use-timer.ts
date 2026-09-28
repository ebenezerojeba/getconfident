"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import * as T from "./timer";

/** React binding for the pure timestamp-based timer. Calls onTimeUp once. */
export function useTimer(durationMs: number, onTimeUp: () => void) {
  const [state, setState] = useState(() => T.createTimer(durationMs));
  const [now, setNow] = useState(() => performance.now());
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => setNow(performance.now()), 200);
    return () => window.clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "running" && T.isTimeUp(state, now) && !firedRef.current) {
      firedRef.current = true;
      setState((s) => T.finish(s, performance.now()));
      onTimeUpRef.current();
    }
  }, [state, now]);

  const start = useCallback(() => {
    firedRef.current = false;
    const t = performance.now();
    setNow(t);
    setState((s) => T.start(s, t));
  }, []);
  const pause = useCallback(() => setState((s) => T.pause(s, performance.now())), []);
  const resume = useCallback(() => {
    const t = performance.now();
    setNow(t);
    setState((s) => T.resume(s, t));
  }, []);
  const finish = useCallback(() => setState((s) => T.finish(s, performance.now())), []);
  const reset = useCallback(() => {
    firedRef.current = false;
    setState((s) => T.reset(s));
  }, []);

  const current = state.status === "running" ? now : performance.now();
  return {
    status: state.status,
    elapsedMs: T.elapsedMs(state, state.status === "running" ? now : current),
    remainingMs: T.remainingMs(state, state.status === "running" ? now : current),
    durationMs,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
