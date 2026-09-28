import type { OpenAIVerboseTranscription } from "@/lib/ai/openai";

import { type NormalizedTranscript, normalizedTranscriptSchema } from "./types";

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** Converts an OpenAI transcription response into the normalized, validated shape. */
export function normalizeOpenAITranscription(
  raw: OpenAIVerboseTranscription,
  fallbackDurationSec?: number | null,
): NormalizedTranscript {
  const segments = (raw.segments ?? [])
    .filter((s) => finite(s.start) && finite(s.end) && s.end >= s.start)
    .map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }))
    .filter((s) => s.text.length > 0);

  const words = raw.words?.length
    ? raw.words
        .filter((w) => finite(w.start) && finite(w.end) && w.word.trim())
        .map((w) => ({ word: w.word.trim(), start: w.start, end: w.end }))
    : null;

  const duration =
    finite(raw.duration) && raw.duration > 0 ? raw.duration : fallbackDurationSec || null;

  return normalizedTranscriptSchema.parse({
    text: (raw.text ?? "").replace(/\s+/g, " ").trim(),
    language: raw.language ?? null,
    durationSec: duration && duration > 0 ? duration : null,
    segments,
    words,
  });
}
