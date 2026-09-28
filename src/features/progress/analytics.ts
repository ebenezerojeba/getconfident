import { computeStreaks, dateKeyInZone, type StreakResult } from "./streaks";

/** One completed, analyzed session (the only input analytics needs). */
export type SessionPoint = {
  id: string;
  completedAt: Date;
  mode: string;
  overallScore: number;
  confidenceScore: number;
  grammarScore: number;
  fillerPerMinute: number;
  wordsPerMinute: number | null;
  elapsedSec: number | null;
};

export type Bucket = {
  key: string; // YYYY-MM-DD (week start, Monday) or YYYY-MM
  label: string;
  sessions: number;
  avgScore: number | null;
  avgFillerPerMin: number | null;
  speakingSec: number;
};

export type ProgressSummary = {
  totalSessions: number;
  averageScore: number | null;
  averageConfidence: number | null;
  averageGrammar: number | null;
  averagePace: number | null;
  totalSpeakingSec: number;
  /** % reduction in filler/min: early sessions vs recent sessions. Null if too few sessions. */
  fillerReductionPct: number | null;
  /** Latest minus earliest average score (same windows). */
  scoreChange: number | null;
  streak: StreakResult;
  weekly: Bucket[];
  monthly: Bucket[];
  series: {
    id: string;
    date: string;
    score: number;
    confidence: number;
    grammar: number;
    fillerPerMinute: number;
    pace: number | null;
  }[];
};

export const TREND_WINDOW = 5;
const DAY = 86_400_000;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
const round0 = (n: number | null) => (n === null ? null : Math.round(n));

function dayNumber(key: string) {
  return Math.round(Date.parse(`${key}T00:00:00Z`) / DAY);
}
function keyFromDay(n: number) {
  return new Date(n * DAY).toISOString().slice(0, 10);
}
/** Monday-based week start for a YYYY-MM-DD key. */
export function weekStart(key: string): string {
  const n = dayNumber(key);
  const dow = (new Date(n * DAY).getUTCDay() + 6) % 7; // Mon=0
  return keyFromDay(n - dow);
}

function shortDate(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function monthLabel(key: string) {
  const month = new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    timeZone: "UTC",
  });
  // "Sep '26" reads as a month, unlike "Sep 26" which looks like a date.
  return `${month} '${key.slice(2, 4)}`;
}

function bucketize(
  points: { key: string; p: SessionPoint }[],
  keys: string[],
  label: (k: string) => string,
): Bucket[] {
  return keys.map((key) => {
    const inBucket = points.filter((x) => x.key === key).map((x) => x.p);
    return {
      key,
      label: label(key),
      sessions: inBucket.length,
      avgScore: round0(avg(inBucket.map((p) => p.overallScore))),
      avgFillerPerMin: round1(avg(inBucket.map((p) => p.fillerPerMinute))),
      speakingSec: inBucket.reduce((s, p) => s + (p.elapsedSec ?? 0), 0),
    };
  });
}

/**
 * Derives all progress metrics from completed sessions (server-side, never from
 * client state). Dates are bucketed in the user's time zone.
 */
export function computeProgress(
  sessions: SessionPoint[],
  timeZone: string,
  now = new Date(),
  options: { weeks?: number; months?: number } = {},
): ProgressSummary {
  const weeks = options.weeks ?? 8;
  const months = options.months ?? 6;
  const sorted = [...sessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  const todayKey = dateKeyInZone(now, timeZone);
  const keyed = sorted.map((p) => ({ p, day: dateKeyInZone(p.completedAt, timeZone) }));

  const thisWeek = weekStart(todayKey);
  const weekKeys = Array.from({ length: weeks }, (_, i) =>
    keyFromDay(dayNumber(thisWeek) - (weeks - 1 - i) * 7),
  );
  const [y, m] = todayKey.split("-").map(Number);
  const monthKeys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });

  const early = sorted.slice(0, TREND_WINDOW);
  const recent = sorted.slice(-TREND_WINDOW);
  const enough = sorted.length >= 2 * TREND_WINDOW;
  const earlyFiller = avg(early.map((p) => p.fillerPerMinute));
  const recentFiller = avg(recent.map((p) => p.fillerPerMinute));
  let fillerReductionPct: number | null = null;
  if (enough && earlyFiller !== null && recentFiller !== null) {
    fillerReductionPct =
      earlyFiller === 0
        ? recentFiller === 0
          ? 0
          : -100
        : round0(((earlyFiller - recentFiller) / earlyFiller) * 100);
  }
  const scoreChange = enough
    ? round0(avg(recent.map((p) => p.overallScore))! - avg(early.map((p) => p.overallScore))!)
    : null;

  return {
    totalSessions: sorted.length,
    averageScore: round0(avg(sorted.map((p) => p.overallScore))),
    averageConfidence: round0(avg(sorted.map((p) => p.confidenceScore))),
    averageGrammar: round0(avg(sorted.map((p) => p.grammarScore))),
    averagePace: round0(
      avg(sorted.flatMap((p) => (p.wordsPerMinute === null ? [] : [p.wordsPerMinute]))),
    ),
    totalSpeakingSec: sorted.reduce((s, p) => s + (p.elapsedSec ?? 0), 0),
    fillerReductionPct,
    scoreChange,
    streak: computeStreaks(
      keyed.map((k) => k.day),
      todayKey,
    ),
    weekly: bucketize(
      keyed.map((k) => ({ key: weekStart(k.day), p: k.p })),
      weekKeys,
      (k) => shortDate(k),
    ),
    monthly: bucketize(
      keyed.map((k) => ({ key: k.day.slice(0, 7), p: k.p })),
      monthKeys,
      monthLabel,
    ),
    series: keyed.map(({ p, day }) => ({
      id: p.id,
      date: day,
      score: p.overallScore,
      confidence: p.confidenceScore,
      grammar: p.grammarScore,
      fillerPerMinute: Math.round(p.fillerPerMinute * 10) / 10,
      pace: p.wordsPerMinute === null ? null : Math.round(p.wordsPerMinute),
    })),
  };
}

export const RANGES = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  all: { label: "All time", days: null },
} as const;
export type RangeKey = keyof typeof RANGES;

export function parseRange(value: unknown): RangeKey {
  return typeof value === "string" && value in RANGES ? (value as RangeKey) : "30d";
}

export function rangeStart(range: RangeKey, now = new Date()): Date | null {
  const days = RANGES[range].days;
  return days === null ? null : new Date(now.getTime() - days * DAY);
}

export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
