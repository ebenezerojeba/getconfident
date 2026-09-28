import type { AchievementCode } from "./catalog";

export type AchievementStats = {
  completedSessions: number;
  longestStreak: number;
  /** Latest completed session. */
  latest: {
    overallScore: number;
    fillerCount: number;
    elapsedSec: number | null;
  } | null;
  highConfidenceSessions: number; // confidence >= 85
  strongInterviewSessions: number; // interview mode, overall >= 80
  strongPresentationSessions: number; // presentation mode, overall >= 80
  anyPerfectScore: boolean;
  anyCleanSession: boolean; // 0 fillers and >= 30s
};

/** Pure, deterministic rules. Evaluating twice yields the same set. */
export const RULES: Record<AchievementCode, (s: AchievementStats) => boolean> = {
  FIRST_PRACTICE: (s) => s.completedSessions >= 1,
  SEVEN_DAY_STREAK: (s) => s.longestStreak >= 7,
  THIRTY_DAY_STREAK: (s) => s.longestStreak >= 30,
  HUNDRED_SPEECHES: (s) => s.completedSessions >= 100,
  NO_FILLER_WORDS: (s) => s.anyCleanSession,
  PERFECT_SCORE: (s) => s.anyPerfectScore,
  CONFIDENT_SPEAKER: (s) => s.highConfidenceSessions >= 5,
  INTERVIEW_MASTER: (s) => s.strongInterviewSessions >= 10,
  PRESENTATION_EXPERT: (s) => s.strongPresentationSessions >= 10,
};

export function evaluateAchievements(stats: AchievementStats): AchievementCode[] {
  return (Object.keys(RULES) as AchievementCode[]).filter((code) => RULES[code](stats));
}
