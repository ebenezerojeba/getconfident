import {
  computeProgress,
  formatDuration,
  parseRange,
  rangeStart,
  type SessionPoint,
  weekStart,
} from "./analytics";

const NOW = new Date("2026-09-19T15:00:00Z"); // Saturday

let n = 0;
function s(iso: string, over: Partial<SessionPoint> = {}): SessionPoint {
  return {
    id: `s${n++}`,
    completedAt: new Date(iso),
    mode: "IMPROMPTU",
    overallScore: 70,
    confidenceScore: 60,
    grammarScore: 80,
    fillerPerMinute: 4,
    wordsPerMinute: 140,
    elapsedSec: 60,
    ...over,
  };
}

describe("computeProgress", () => {
  it("handles no sessions", () => {
    const p = computeProgress([], "UTC", NOW);
    expect(p.totalSessions).toBe(0);
    expect(p.averageScore).toBeNull();
    expect(p.averagePace).toBeNull();
    expect(p.fillerReductionPct).toBeNull();
    expect(p.streak).toEqual({ current: 0, longest: 0, practicedToday: false });
    expect(p.weekly).toHaveLength(8);
    expect(p.weekly.every((b) => b.sessions === 0 && b.avgScore === null)).toBe(true);
    expect(p.monthly).toHaveLength(6);
  });

  it("computes averages, totals and pace (ignoring missing pace)", () => {
    const p = computeProgress(
      [
        s("2026-09-18T10:00:00Z", { overallScore: 60, wordsPerMinute: null, elapsedSec: 30 }),
        s("2026-09-19T10:00:00Z", { overallScore: 81, wordsPerMinute: 150, elapsedSec: 90 }),
      ],
      "UTC",
      NOW,
    );
    expect(p.totalSessions).toBe(2);
    expect(p.averageScore).toBe(71); // 70.5 rounds to 71
    expect(p.averagePace).toBe(150);
    expect(p.totalSpeakingSec).toBe(120);
    expect(p.streak).toMatchObject({ current: 2, practicedToday: true });
  });

  it("buckets by Monday-based week and by month in the user's zone", () => {
    const p = computeProgress(
      [
        s("2026-09-14T12:00:00Z"), // Mon of current week
        s("2026-09-19T12:00:00Z"), // Sat of current week
        s("2026-09-13T12:00:00Z"), // Sun of previous week
        s("2026-08-02T12:00:00Z"),
      ],
      "UTC",
      NOW,
    );
    expect(p.weekly.at(-1)).toMatchObject({ key: "2026-09-14", sessions: 2 });
    expect(p.weekly.at(-2)).toMatchObject({ key: "2026-09-07", sessions: 1 });
    expect(p.monthly.at(-1)).toMatchObject({ key: "2026-09", sessions: 3 });
    expect(p.monthly.at(-2)).toMatchObject({ key: "2026-08", sessions: 1 });
    expect(p.monthly[0].key).toBe("2026-04");
  });

  it("uses the time zone for day boundaries", () => {
    // 03:00 UTC on the 19th is still the 18th in New York.
    const p = computeProgress([s("2026-09-19T03:00:00Z")], "America/New_York", NOW);
    expect(p.series[0].date).toBe("2026-09-18");
  });

  it("computes filler reduction and score change once there are enough sessions", () => {
    const early = Array.from({ length: 5 }, (_, i) =>
      s(`2026-09-0${i + 1}T10:00:00Z`, { fillerPerMinute: 8, overallScore: 60 }),
    );
    const late = Array.from({ length: 5 }, (_, i) =>
      s(`2026-09-1${i + 1}T10:00:00Z`, { fillerPerMinute: 2, overallScore: 80 }),
    );
    const p = computeProgress([...late, ...early], "UTC", NOW); // unsorted input
    expect(p.fillerReductionPct).toBe(75);
    expect(p.scoreChange).toBe(20);
    expect(computeProgress(early, "UTC", NOW).fillerReductionPct).toBeNull();
  });

  it("handles zero early filler rate without dividing by zero", () => {
    const early = Array.from({ length: 5 }, (_, i) =>
      s(`2026-09-0${i + 1}T10:00:00Z`, { fillerPerMinute: 0 }),
    );
    const late = Array.from({ length: 5 }, (_, i) =>
      s(`2026-09-1${i + 1}T10:00:00Z`, { fillerPerMinute: 0 }),
    );
    expect(computeProgress([...early, ...late], "UTC", NOW).fillerReductionPct).toBe(0);
  });

  it("returns the chronological series", () => {
    const p = computeProgress([s("2026-09-19T10:00:00Z"), s("2026-09-10T10:00:00Z")], "UTC", NOW);
    expect(p.series.map((x) => x.date)).toEqual(["2026-09-10", "2026-09-19"]);
  });
});

describe("helpers", () => {
  it("weekStart returns Monday", () => {
    expect(weekStart("2026-09-19")).toBe("2026-09-14");
    expect(weekStart("2026-09-14")).toBe("2026-09-14");
    expect(weekStart("2026-09-13")).toBe("2026-09-07");
  });
  it("parses ranges defensively", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("all")).toBe("all");
    expect(parseRange("bogus")).toBe("30d");
    expect(parseRange(undefined)).toBe("30d");
    expect(rangeStart("all", NOW)).toBeNull();
    expect(rangeStart("7d", NOW)?.toISOString()).toBe("2026-09-12T15:00:00.000Z");
  });
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(125)).toBe("2m");
    expect(formatDuration(3725)).toBe("1h 2m");
  });
});
