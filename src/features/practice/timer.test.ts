import { TIMER_OPTIONS_SEC } from "@/config/practice";

import {
  createTimer,
  elapsedMs,
  finish,
  formatClock,
  isTimeUp,
  pause,
  remainingMs,
  reset,
  resume,
  start,
} from "./timer";

describe("timer", () => {
  it("rejects invalid durations", () => {
    expect(() => createTimer(0)).toThrow();
    expect(() => createTimer(-5)).toThrow();
    expect(() => createTimer(Number.NaN)).toThrow();
  });

  it("does not advance while idle", () => {
    const t = createTimer(60_000);
    expect(elapsedMs(t, 99_999)).toBe(0);
    expect(remainingMs(t, 99_999)).toBe(60_000);
  });

  it("tracks elapsed time from timestamps", () => {
    const t = start(createTimer(60_000), 1_000);
    expect(elapsedMs(t, 11_000)).toBe(10_000);
    expect(remainingMs(t, 11_000)).toBe(50_000);
  });

  it("pauses and resumes without counting paused time", () => {
    let t = start(createTimer(60_000), 0);
    t = pause(t, 10_000);
    expect(elapsedMs(t, 50_000)).toBe(10_000);
    t = resume(t, 50_000);
    expect(elapsedMs(t, 55_000)).toBe(15_000);
  });

  it("ignores invalid transitions", () => {
    const idle = createTimer(1000);
    expect(pause(idle, 5)).toBe(idle);
    expect(resume(idle, 5)).toBe(idle);
    const running = start(idle, 0);
    expect(start(running, 10)).toBe(running);
    expect(resume(running, 10)).toBe(running);
  });

  it("caps elapsed at the duration and reports time up", () => {
    const t = start(createTimer(30_000), 0);
    expect(elapsedMs(t, 45_000)).toBe(30_000);
    expect(remainingMs(t, 45_000)).toBe(0);
    expect(isTimeUp(t, 29_999)).toBe(false);
    expect(isTimeUp(t, 30_000)).toBe(true);
  });

  it("freezes elapsed time when finished early", () => {
    let t = start(createTimer(120_000), 0);
    t = finish(t, 42_000);
    expect(t.status).toBe("finished");
    expect(elapsedMs(t, 100_000)).toBe(42_000);
    expect(isTimeUp(t, 0)).toBe(true);
  });

  it("finishes correctly while paused", () => {
    let t = start(createTimer(60_000), 0);
    t = pause(t, 20_000);
    t = finish(t, 90_000);
    expect(elapsedMs(t, 90_000)).toBe(20_000);
  });

  it("restarts from zero", () => {
    let t = start(createTimer(60_000), 0);
    t = reset(t);
    expect(t.status).toBe("idle");
    expect(elapsedMs(t, 99_999)).toBe(0);
    expect(t.durationMs).toBe(60_000);
  });

  it("is robust to clock readings before the start (clock skew)", () => {
    const t = start(createTimer(60_000), 10_000);
    expect(elapsedMs(t, 5_000)).toBe(0);
  });

  it.each(TIMER_OPTIONS_SEC.map((s) => [s]))("supports the %i second option", (sec) => {
    const t = start(createTimer(sec * 1000), 0);
    expect(isTimeUp(t, sec * 1000 - 1)).toBe(false);
    expect(isTimeUp(t, sec * 1000)).toBe(true);
  });

  it("formats the clock", () => {
    expect(formatClock(120_000)).toBe("2:00");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(59_000)).toBe("0:59");
    expect(formatClock(600_000)).toBe("10:00");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(1_999, false)).toBe("0:01");
  });
});
