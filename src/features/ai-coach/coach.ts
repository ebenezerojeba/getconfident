import "server-only";

import { analyzeFillers, type FillerAnalysis } from "@/features/filler-analysis/analyze";
import { computeSpeechMetrics, type SpeechMetrics } from "@/features/transcription/metrics";
import type { NormalizedTranscript } from "@/features/transcription/types";
import { chatJson } from "@/lib/ai/openai";
import { getAIProviderName } from "@/lib/ai/provider";
import { AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { mockCoachReport } from "./mock-coach";
import { normalizeReport } from "./normalize";
import { type AnalysisContext, buildCoachUserPrompt, COACH_SYSTEM_PROMPT } from "./prompt";
import { type CoachReport, llmReportSchema } from "./schema";

export type SpeechAnalysisResult = {
  report: CoachReport;
  fillers: FillerAnalysis;
  speech: SpeechMetrics;
  provider: string;
  model: string;
};

export const MIN_WORDS_FOR_ANALYSIS = 5;

/**
 * Full analysis pipeline: deterministic metrics → prompt → LLM structured output
 * → normalization/validation. Malformed model output is retried once.
 */
export async function analyzeSpeech(
  transcript: NormalizedTranscript,
  ctx: AnalysisContext,
  options: { signal?: AbortSignal } = {},
): Promise<SpeechAnalysisResult> {
  const speech = computeSpeechMetrics(transcript, ctx.elapsedSec);
  const fillers = analyzeFillers(transcript.text, {
    durationSec: speech.durationSec,
    words: transcript.words,
  });

  if (speech.wordCount < MIN_WORDS_FOR_ANALYSIS) {
    throw new AppError(
      "AI_ANALYSIS",
      "We couldn't hear enough speech to analyze. Check your microphone and try a longer answer.",
    );
  }

  const metrics = { speech, fillers };
  const provider = getAIProviderName();

  if (provider === "mock") {
    const raw = mockCoachReport(transcript.text, ctx, speech, fillers);
    return { report: normalizeReport(raw, metrics), fillers, speech, provider, model: "mock" };
  }

  const user = buildCoachUserPrompt(transcript.text, ctx, speech, fillers);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, model } = await chatJson({
        schema: llmReportSchema,
        schemaName: "speech_coach_report",
        system: COACH_SYSTEM_PROMPT,
        user,
        temperature: attempt === 0 ? 0.3 : 0.1,
        signal: options.signal,
      });
      return { report: normalizeReport(data, metrics), fillers, speech, provider, model };
    } catch (error) {
      lastError = error;
      // Only retry malformed output; transport errors were already retried in chatJson.
      const malformed =
        !isAppError(error) ||
        /unexpected|unreadable/.test(error.message) ||
        error.name === "ZodError";
      logger.warn("ai_coach.attempt_failed", { attempt, malformed, error });
      if (!malformed) break;
    }
  }
  if (isAppError(lastError)) throw lastError;
  throw new AppError("AI_ANALYSIS", "The AI coach returned an unexpected response.", {
    cause: lastError,
  });
}
