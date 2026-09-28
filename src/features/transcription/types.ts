import { z } from "zod";

export const segmentSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
});

export const timedWordSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

/** Provider-agnostic transcript shape stored in the Transcript table. */
export const normalizedTranscriptSchema = z.object({
  text: z.string(),
  language: z.string().nullable(),
  durationSec: z.number().positive().nullable(),
  segments: z.array(segmentSchema),
  words: z.array(timedWordSchema).nullable(),
});

export type NormalizedTranscript = z.infer<typeof normalizedTranscriptSchema>;
export type TranscriptSegment = z.infer<typeof segmentSchema>;

export type TranscriptionInput = {
  audio: Uint8Array;
  mimeType: string;
  /** Optional hint that improves accuracy for short prompts. */
  prompt?: string;
  language?: string;
  signal?: AbortSignal;
};

export interface TranscriptionService {
  readonly name: string;
  transcribe(input: TranscriptionInput): Promise<NormalizedTranscript>;
}
