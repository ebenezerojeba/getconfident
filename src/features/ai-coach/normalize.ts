import type { FillerAnalysis } from "@/features/filler-analysis/analyze";
import type { SpeechMetrics } from "@/features/transcription/metrics";

import {
  type Assessment,
  type CoachReport,
  coachReportSchema,
  DIMENSIONS,
  type LlmReport,
  TOASTMASTERS_CRITERIA,
  VISUAL_ONLY,
} from "./schema";

export type DeterministicMetrics = {
  speech: SpeechMetrics;
  fillers: FillerAnalysis;
};

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

const clean = (s: string | undefined | null, max: number, fallback = "") => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return (t || fallback).slice(0, max);
};

const cleanList = (list: string[], max: number, maxLen: number, fallback: string) => {
  const out = list
    .map((s) => clean(s, maxLen))
    .filter(Boolean)
    .slice(0, max);
  return out.length ? out : [fallback];
};

function normalizeAssessment(a: LlmReport["dimensions"]["clarity"], fallback: string): Assessment {
  const feedback = clean(a.feedback, 600, fallback);
  if (a.basis === "unavailable" || a.score === null || !Number.isFinite(a.score)) {
    return { score: null, basis: "unavailable", feedback };
  }
  return { score: clamp(a.score), basis: a.basis, feedback };
}

/** Score for filler usage: 0 fillers/min → 100, ~10+/min → near 0. */
export function scoreFillers(f: FillerAnalysis): number {
  const rate = f.perMinute ?? f.fillerPercent; // percent is a rough proxy without duration
  return clamp(100 - rate * 9);
}

function fillerFeedback(f: FillerAnalysis): string {
  if (f.totalFillers === 0) return "No filler words detected. Excellent control.";
  const top = f.byFiller
    .slice(0, 3)
    .map((s) => `"${s.filler}" ×${s.count}`)
    .join(", ");
  const rate = f.perMinute !== null ? ` (${f.perMinute} per minute)` : "";
  return `${f.totalFillers} filler words detected${rate}. Most frequent: ${top}.`;
}

function paceFeedback(m: SpeechMetrics): string {
  const wpm = m.wordsPerMinute!;
  if (wpm < 110)
    return `About ${wpm} words per minute: slower than typical conversational pace (130–160).`;
  if (wpm > 175)
    return `About ${wpm} words per minute: faster than typical conversational pace (130–160).`;
  return `About ${wpm} words per minute: a comfortable, easy-to-follow pace.`;
}

function pauseFeedback(m: SpeechMetrics): string {
  if (!m.longPauses.length) return "No long pauses (2s+) detected.";
  return `${m.longPauses.length} long pause(s) of 2 seconds or more; the longest was ${m.longestPauseSec}s.`;
}

/**
 * Repairs raw model output into a valid CoachReport and overrides measurable
 * dimensions with deterministic values, so numbers shown to users for pace,
 * pauses and fillers are computed, not guessed. Throws if the result is still
 * invalid (treated as malformed output by the caller).
 */
export function normalizeReport(raw: LlmReport, metrics: DeterministicMetrics): CoachReport {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d) => [
      d.key,
      normalizeAssessment(raw.dimensions[d.key], `${d.label} feedback unavailable.`),
    ]),
  ) as CoachReport["dimensions"];

  const { speech, fillers } = metrics;
  dimensions.fillerWords = {
    score: scoreFillers(fillers),
    basis: "observed",
    feedback: fillerFeedback(fillers),
  };
  dimensions.pace =
    speech.paceScore !== null
      ? { score: speech.paceScore, basis: "observed", feedback: paceFeedback(speech) }
      : {
          score: null,
          basis: "unavailable",
          feedback: "Speaking duration unavailable, so pace wasn't measured.",
        };
  dimensions.pauses =
    speech.pauseScore !== null
      ? { score: speech.pauseScore, basis: "observed", feedback: pauseFeedback(speech) }
      : dimensions.pauses.basis === "observed"
        ? { ...dimensions.pauses, basis: "inferred" }
        : dimensions.pauses;

  const toastmasters = Object.fromEntries(
    TOASTMASTERS_CRITERIA.map((c) => {
      if (VISUAL_ONLY.includes(c.key)) {
        return [
          c.key,
          {
            score: null,
            basis: "unavailable",
            feedback: "Not measured: video/body-language analysis isn't available yet.",
          } satisfies Assessment,
        ];
      }
      return [
        c.key,
        normalizeAssessment(raw.toastmasters[c.key], `${c.label} feedback unavailable.`),
      ];
    }),
  ) as Omit<CoachReport["toastmasters"], "summary" | "recommendations">;

  const report: CoachReport = {
    overallScore: clamp(raw.overallScore),
    summary: clean(raw.summary, 800, "Analysis complete."),
    dimensions,
    strengths: cleanList(
      raw.strengths,
      5,
      300,
      "You completed the session. That's the first step.",
    ),
    weaknesses: cleanList(raw.weaknesses, 5, 300, "Keep practicing to reveal patterns to improve."),
    suggestions: cleanList(
      raw.suggestions,
      6,
      300,
      "Practice another topic at the same difficulty.",
    ),
    betterWording: raw.betterWording
      .map((b) => ({
        original: clean(b.original, 400),
        improved: clean(b.improved, 400),
        why: clean(b.why, 300, "Clearer and more direct."),
      }))
      .filter((b) => b.original && b.improved && b.original !== b.improved)
      .slice(0, 5),
    grammarCorrections: raw.grammarCorrections
      .map((g) => ({
        original: clean(g.original, 400),
        corrected: clean(g.corrected, 400),
        explanation: clean(g.explanation, 300, "Grammar correction."),
      }))
      .filter((g) => g.original && g.corrected && g.original !== g.corrected)
      .slice(0, 8),
    confidenceTips: cleanList(raw.confidenceTips, 4, 300, "Pause and breathe before key points."),
    homework: (raw.homework.length ? raw.homework : [{ title: "", description: "" }])
      .map((h) => ({
        title: clean(h.title, 100, "Practice again"),
        description: clean(h.description, 400, "Record one more session on a new topic."),
      }))
      .slice(0, 3),
    nextPractice: {
      mode: raw.nextPractice.mode,
      difficulty: raw.nextPractice.difficulty,
      focus: clean(raw.nextPractice.focus, 200, "Clear structure"),
      reason: clean(raw.nextPractice.reason, 300, "Builds on this session."),
    },
    modeCriteria: raw.modeCriteria
      .map((m) => ({
        name: clean(m.name, 80),
        score: clamp(m.score),
        feedback: clean(m.feedback, 400, "No additional feedback."),
      }))
      .filter((m) => m.name)
      .slice(0, 6),
    toastmasters: {
      ...toastmasters,
      summary: clean(raw.toastmasters.summary, 800, "Evaluation complete."),
      recommendations: cleanList(
        raw.toastmasters.recommendations,
        5,
        300,
        "Open with a clear hook and close with a one-sentence takeaway.",
      ),
    },
  };

  return coachReportSchema.parse(report);
}
