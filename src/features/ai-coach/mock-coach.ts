import { getMode } from "@/config/practice-modes";
import type { FillerAnalysis } from "@/features/filler-analysis/analyze";
import type { SpeechMetrics } from "@/features/transcription/metrics";

import type { AnalysisContext } from "./prompt";
import { DIMENSIONS, type LlmReport, TOASTMASTERS_CRITERIA } from "./schema";

/**
 * DEV/TEST ONLY. Produces a deterministic, clearly-labelled placeholder report
 * from measured metrics so the pipeline can run without an AI key. It does not
 * understand the speech and must never be presented as real coaching.
 */
export function mockCoachReport(
  transcript: string,
  ctx: AnalysisContext,
  speech: SpeechMetrics,
  fillers: FillerAnalysis,
): LlmReport {
  const lengthScore = Math.min(100, Math.round((speech.wordCount / 120) * 100));
  const fillerPenalty = Math.min(40, fillers.totalFillers * 4);
  const base = Math.max(35, Math.min(92, Math.round(lengthScore * 0.5 + 45 - fillerPenalty / 2)));
  const firstSentence = transcript.split(/(?<=[.!?])\s+/)[0]?.slice(0, 300) || "Your opening.";
  const mode = getMode(ctx.mode);

  const assess = (offset: number, basis: "observed" | "inferred" = "observed") => ({
    score: Math.max(0, Math.min(100, base + offset)),
    basis,
    feedback: "[Mock analysis] Placeholder feedback generated without an AI model.",
  });

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d, i) => [
      d.key,
      assess(
        (i % 5) * 2 - 4,
        ["tone", "energy", "confidence"].includes(d.key) ? "inferred" : "observed",
      ),
    ]),
  ) as LlmReport["dimensions"];

  const toastmasters = Object.fromEntries(
    TOASTMASTERS_CRITERIA.map((c, i) => [
      c.key,
      c.key === "voiceVariety"
        ? {
            score: null,
            basis: "unavailable" as const,
            feedback: "Not measurable from a transcript.",
          }
        : assess((i % 4) * 2 - 3),
    ]),
  ) as Omit<LlmReport["toastmasters"], "summary" | "recommendations">;

  return {
    overallScore: base,
    summary: `[Mock analysis] Development placeholder for "${ctx.topic}". Configure OPENAI_API_KEY for real coaching.`,
    dimensions,
    strengths: ["[Mock] You completed a full practice session.", "[Mock] You stayed on the topic."],
    weaknesses: [
      fillers.totalFillers
        ? `[Mock] ${fillers.totalFillers} filler words were detected.`
        : "[Mock] Try adding a clearer conclusion.",
    ],
    suggestions: ["[Mock] Open with your main point, then give one reason and one example."],
    betterWording: [
      {
        original: firstSentence,
        improved: "[Mock] Here's my main point, and here's why it matters.",
        why: "[Mock] Leads with the key message.",
      },
    ],
    grammarCorrections: [],
    confidenceTips: ["[Mock] Replace filler words with a short, silent pause."],
    homework: [
      {
        title: "[Mock] One-minute drill",
        description: "[Mock] Answer a random topic in 60 seconds using point–reason–example.",
      },
    ],
    nextPractice: {
      mode: ctx.mode,
      difficulty: ctx.difficulty,
      focus: "Clear structure",
      reason: "[Mock] Repeat the same mode to compare scores.",
    },
    modeCriteria: mode.evaluationCriteria.map((c, i) => ({
      name: c.name,
      score: Math.max(0, base - i * 3),
      feedback: "[Mock] Placeholder criterion feedback.",
    })),
    toastmasters: {
      ...toastmasters,
      summary: "[Mock analysis] Placeholder Toastmasters-style evaluation.",
      recommendations: ["[Mock] Use a clear opening, body and conclusion."],
    },
  };
}
