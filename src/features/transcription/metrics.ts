import type { NormalizedTranscript } from "./types";

export const LONG_PAUSE_SEC = 2;

export type Pause = { start: number; end: number; duration: number };
export type Repetition = { word: string; wordIndex: number; count: number };

export type SpeechMetrics = {
  wordCount: number;
  durationSec: number | null;
  wordsPerMinute: number | null;
  longPauses: Pause[];
  longestPauseSec: number | null;
  repetitions: Repetition[];
  /** Deterministic 0–100 pace score (null when duration unknown). */
  paceScore: number | null;
  /** Deterministic 0–100 pause-control score (null when no timing data). */
  pauseScore: number | null;
};

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function countWords(text: string): number {
  return text.match(/[a-z0-9]+(?:['’][a-z]+)*/gi)?.length ?? 0;
}

/**
 * Long pauses are gaps between consecutive words (preferred) or segments of at
 * least LONG_PAUSE_SEC seconds.
 */
export function detectLongPauses(t: Pick<NormalizedTranscript, "words" | "segments">): Pause[] {
  const spans =
    t.words && t.words.length > 1
      ? t.words.map((w) => ({ start: w.start, end: w.end }))
      : t.segments.map((s) => ({ start: s.start, end: s.end }));
  const pauses: Pause[] = [];
  for (let i = 1; i < spans.length; i++) {
    const gap = spans[i].start - spans[i - 1].end;
    if (gap >= LONG_PAUSE_SEC) {
      pauses.push({ start: spans[i - 1].end, end: spans[i].start, duration: round(gap, 2) });
    }
  }
  return pauses;
}

/**
 * Immediate repetitions such as "I I think" or "the the", which usually signal
 * hesitation. Intentional doubles ("very very", "no no") still count but are
 * reported with the word so the report can phrase it gently.
 */
export function detectRepetitions(text: string): Repetition[] {
  const words = text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? [];
  const out: Repetition[] = [];
  for (let i = 1; i < words.length;) {
    if (words[i] === words[i - 1] && !/^\d+$/.test(words[i])) {
      let n = 2;
      while (words[i + n - 1] === words[i - 1]) n++;
      out.push({ word: words[i - 1], wordIndex: i - 1, count: n });
      i += n - 1;
    } else {
      i++;
    }
  }
  return out;
}

/** 130–160 wpm is a comfortable conversational pace; score falls off outside it. */
export function scorePace(wpm: number | null): number | null {
  if (wpm === null) return null;
  if (wpm >= 130 && wpm <= 160) return 100;
  const distance = wpm < 130 ? 130 - wpm : wpm - 160;
  return Math.max(0, Math.round(100 - distance * 1.4));
}

export function scorePauses(longPauses: Pause[], durationSec: number | null): number | null {
  if (!durationSec) return null;
  const minutes = Math.max(durationSec / 60, 0.25);
  const perMinute = longPauses.length / minutes;
  const longest = Math.max(0, ...longPauses.map((p) => p.duration));
  let score = 100 - perMinute * 12 - Math.max(0, longest - 3) * 5;
  score = Math.min(100, Math.max(0, score));
  return Math.round(score);
}

export function computeSpeechMetrics(
  t: NormalizedTranscript,
  fallbackDurationSec?: number | null,
): SpeechMetrics {
  const wordCount = countWords(t.text);
  const durationSec = t.durationSec ?? (fallbackDurationSec || null);
  const wordsPerMinute =
    durationSec && durationSec >= 5 && wordCount > 0 ? round(wordCount / (durationSec / 60)) : null;
  const hasTiming = (t.words?.length ?? 0) > 1 || t.segments.length > 1;
  const longPauses = hasTiming ? detectLongPauses(t) : [];
  return {
    wordCount,
    durationSec,
    wordsPerMinute,
    longPauses,
    longestPauseSec: longPauses.length ? Math.max(...longPauses.map((p) => p.duration)) : null,
    repetitions: detectRepetitions(t.text),
    paceScore: scorePace(wordsPerMinute),
    pauseScore: hasTiming ? scorePauses(longPauses, durationSec) : null,
  };
}
