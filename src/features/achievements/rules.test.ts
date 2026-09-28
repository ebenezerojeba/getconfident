import { computeStreaks, dateKeyInZone } from "@/features/progress/streaks";

import { ACHIEVEMENTS } from "./catalog";
import { type AchievementStats, evaluateAchievements, RULES } from "./rules";

const empty: AchievementStats = {
  completedSessions: 0,
  longestStreak: 0,
  latest: null,
  highConfidenceSessions: 0,
  strongInterviewSessions: 0,
  strongPresentationSessions: 0,
  anyPerfectScore: false,
  anyCleanSession: false,
};

describe("achievement rules", () => {
  it("has a rule for every catalog entry", () => {
    expect(Object.keys(RULES).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
  });

  it("earns nothing with no sessions", () => {
    expect(evaluateAchievements(empty)).toEqual([]);
  });

  it("unlocks thresholds exactly", () => {
    expect(evaluateAchievements({ ...empty, completedSessions: 1 })).toEqual(["FIRST_PRACTICE"]);
    expect(
      evaluateAchievements({ ...empty, completedSessions: 1, longestStreak: 6 }),
    ).not.toContain("SEVEN_DAY_STREAK");
    expect(evaluateAchievements({ ...empty, completedSessions: 7, longestStreak: 7 })).toContain(
      "SEVEN_DAY_STREAK",
    );
    expect(evaluateAchievements({ ...empty, completedSessions: 100 })).toContain(
      "HUNDRED_SPEECHES",
    );
    expect(evaluateAchievements({ ...empty, highConfidenceSessions: 5 })).toContain(
      "CONFIDENT_SPEAKER",
    );
    expect(evaluateAchievements({ ...empty, strongInterviewSessions: 9 })).not.toContain(
      "INTERVIEW_MASTER",
    );
    expect(evaluateAchievements({ ...empty, strongPresentationSessions: 10 })).toContain(
      "PRESENTATION_EXPERT",
    );
    expect(evaluateAchievements({ ...empty, anyPerfectScore: true })).toContain("PERFECT_SCORE");
    expect(evaluateAchievements({ ...empty, anyCleanSession: true })).toContain("NO_FILLER_WORDS");
  });

  it("is deterministic", () => {
    const s = { ...empty, completedSessions: 12, longestStreak: 31, anyPerfectScore: true };
    expect(evaluateAchievements(s)).toEqual(evaluateAchievements(s));
  });
});

describe("computeStreaks", () => {
  it("handles no sessions", () => {
    expect(computeStreaks([], "2026-09-19")).toEqual({
      current: 0,
      longest: 0,
      practicedToday: false,
    });
  });

  it("counts consecutive days ending today", () => {
    const r = computeStreaks(
      ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-19"],
      "2026-09-19",
    );
    expect(r).toEqual({ current: 3, longest: 3, practicedToday: true });
  });

  it("keeps the streak alive until the end of the next day", () => {
    expect(computeStreaks(["2026-09-17", "2026-09-18"], "2026-09-19").current).toBe(2);
    expect(computeStreaks(["2026-09-17", "2026-09-18"], "2026-09-20").current).toBe(0);
  });

  it("tracks the longest streak separately", () => {
    const keys = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-02-10",
      "2026-02-11",
    ];
    expect(computeStreaks(keys, "2026-02-11")).toMatchObject({ current: 2, longest: 4 });
  });

  it("crosses month and year boundaries", () => {
    expect(computeStreaks(["2025-12-31", "2026-01-01"], "2026-01-01").current).toBe(2);
    expect(computeStreaks(["2026-02-28", "2026-03-01"], "2026-03-01").current).toBe(2);
  });

  it("is order-independent", () => {
    expect(computeStreaks(["2026-09-19", "2026-09-17", "2026-09-18"], "2026-09-19").current).toBe(
      3,
    );
  });
});

describe("dateKeyInZone", () => {
  it("respects the user's time zone", () => {
    const instant = new Date("2026-09-19T02:30:00Z");
    expect(dateKeyInZone(instant, "UTC")).toBe("2026-09-19");
    expect(dateKeyInZone(instant, "America/Los_Angeles")).toBe("2026-09-18");
    expect(dateKeyInZone(instant, "Asia/Tokyo")).toBe("2026-09-19");
  });
  it("falls back to UTC for unknown zones", () => {
    expect(dateKeyInZone(new Date("2026-09-19T12:00:00Z"), "Not/AZone")).toBe("2026-09-19");
  });
});
