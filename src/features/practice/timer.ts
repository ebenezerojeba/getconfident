/**
 * Pure, timestamp-based countdown timer. Elapsed time is derived from clock
 * readings rather than tick counting, so it stays accurate when the tab is
 * throttled or the UI misses frames.
 */
export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type TimerState = {
  status: TimerStatus;
  durationMs: number;
  /** Time accumulated before the current running stretch. */
  accumulatedMs: number;
  /** Clock reading when the current running stretch began. */
  runningSince: number | null;
};

export function createTimer(durationMs: number): TimerState {
  if (!Number.isFinite(durationMs) || durationMs <= 0)
    throw new Error("Timer duration must be positive.");
  return { status: "idle", durationMs, accumulatedMs: 0, runningSince: null };
}

export function elapsedMs(t: TimerState, now: number): number {
  const running =
    t.status === "running" && t.runningSince !== null ? Math.max(0, now - t.runningSince) : 0;
  return Math.min(t.durationMs, t.accumulatedMs + running);
}

export function remainingMs(t: TimerState, now: number): number {
  return Math.max(0, t.durationMs - elapsedMs(t, now));
}

export function isTimeUp(t: TimerState, now: number): boolean {
  return t.status === "finished" || elapsedMs(t, now) >= t.durationMs;
}

export function start(t: TimerState, now: number): TimerState {
  if (t.status !== "idle") return t;
  return { ...t, status: "running", runningSince: now };
}

export function pause(t: TimerState, now: number): TimerState {
  if (t.status !== "running") return t;
  return { ...t, status: "paused", accumulatedMs: elapsedMs(t, now), runningSince: null };
}

export function resume(t: TimerState, now: number): TimerState {
  if (t.status !== "paused") return t;
  return { ...t, status: "running", runningSince: now };
}

/** Stops the timer, freezing elapsed time (early finish or time-up). */
export function finish(t: TimerState, now: number): TimerState {
  if (t.status === "finished" || t.status === "idle") return { ...t, status: "finished" };
  return { ...t, status: "finished", accumulatedMs: elapsedMs(t, now), runningSince: null };
}

export function reset(t: TimerState): TimerState {
  return createTimer(t.durationMs);
}

/** mm:ss for display. Rounds up so "0:01" shows until the final second ends. */
export function formatClock(ms: number, roundUp = true): string {
  const total = roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
