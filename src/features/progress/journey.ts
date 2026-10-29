import type { SessionPoint } from "./analytics";

/** How many of the latest sessions make up "now" (an average is steadier than one take). */
export const RECENT_WINDOW = 3;

export type JourneySnapshot = {
  score: number;
  confidence: number;
  fillerPerMinute: number;
  pace: number | null;
};

export type Journey = {
  /** When the first (baseline) session was completed. */
  startedAt: Date;
  /** Completed sessions after the first one. */
  sessionsSince: number;
  start: JourneySnapshot;
  /** Average of the latest sessions; null until there's a second session. */
  now: JourneySnapshot | null;
  scoreDelta: number | null;
  confidenceDelta: number | null;
  /** % fewer filler words per minute than day one (negative = more). */
  fillerReductionPct: number | null;
  /** One encouraging sentence about the biggest improvement. */
  highlight: string;
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const snapshot = (p: SessionPoint): JourneySnapshot => ({
  score: p.overallScore,
  confidence: p.confidenceScore,
  fillerPerMinute: p.fillerPerMinute,
  pace: p.wordsPerMinute,
});

/**
 * Compares the user's first session (their starting assessment) with their
 * recent sessions: the "since day one" view. Null when there are no sessions.
 */
export function computeJourney(sessions: SessionPoint[]): Journey | null {
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  const [first, ...rest] = sorted;
  const start = snapshot(first);

  if (!rest.length) {
    return {
      startedAt: first.completedAt,
      sessionsSince: 0,
      start,
      now: null,
      scoreDelta: null,
      confidenceDelta: null,
      fillerReductionPct: null,
      highlight: `Your starting score is ${start.score}. Practise again to see how much you improve.`,
    };
  }

  const recent = rest.slice(-RECENT_WINDOW);
  const paces = recent.flatMap((p) => (p.wordsPerMinute === null ? [] : [p.wordsPerMinute]));
  const now: JourneySnapshot = {
    score: Math.round(avg(recent.map((p) => p.overallScore))),
    confidence: Math.round(avg(recent.map((p) => p.confidenceScore))),
    fillerPerMinute: Math.round(avg(recent.map((p) => p.fillerPerMinute)) * 10) / 10,
    pace: paces.length ? Math.round(avg(paces)) : null,
  };
  const scoreDelta = now.score - start.score;
  const confidenceDelta = now.confidence - start.confidence;
  const fillerReductionPct =
    start.fillerPerMinute > 0
      ? Math.round(((start.fillerPerMinute - now.fillerPerMinute) / start.fillerPerMinute) * 100)
      : null;

  let highlight: string;
  if (fillerReductionPct !== null && fillerReductionPct >= 20) {
    highlight = `You use ${fillerReductionPct}% fewer filler words than on day one.`;
  } else if (scoreDelta >= 3) {
    highlight = `Your score is up ${scoreDelta} points since your first session.`;
  } else if (confidenceDelta >= 3) {
    highlight = `You sound more confident: +${confidenceDelta} since day one.`;
  } else if (rest.length < 3) {
    highlight = "Progress usually shows after 3 to 5 sessions. Keep going!";
  } else {
    highlight = "You're holding steady. Try a harder topic or a new mode to push further.";
  }

  return {
    startedAt: first.completedAt,
    sessionsSince: rest.length,
    start,
    now,
    scoreDelta,
    confidenceDelta,
    fillerReductionPct,
    highlight,
  };
}
