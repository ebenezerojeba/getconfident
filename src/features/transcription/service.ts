import "server-only";

import { transcribeAudio } from "@/lib/ai/openai";
import { getAIProviderName } from "@/lib/ai/provider";

import { MOCK_TRANSCRIPT_TEXT, mockTranscript } from "./mock";
import { normalizeOpenAITranscription } from "./normalize";
import type { NormalizedTranscript, TranscriptionInput, TranscriptionService } from "./types";

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export const openAITranscriptionService: TranscriptionService = {
  name: "openai",
  async transcribe(input: TranscriptionInput): Promise<NormalizedTranscript> {
    const base = input.mimeType.split(";")[0];
    const raw = await transcribeAudio({
      audio: input.audio,
      mimeType: base,
      filename: `recording.${EXTENSIONS[base] ?? "webm"}`,
      prompt: input.prompt,
      language: input.language,
      signal: input.signal,
    });
    return normalizeOpenAITranscription(raw);
  },
};

/** DEV/TEST ONLY. Returns a fixed sample transcript; it does not listen to the audio. */
export const mockTranscriptionService: TranscriptionService = {
  name: "mock",
  async transcribe(): Promise<NormalizedTranscript> {
    return mockTranscript(MOCK_TRANSCRIPT_TEXT);
  },
};

export function getTranscriptionService(): TranscriptionService {
  return getAIProviderName() === "mock" ? mockTranscriptionService : openAITranscriptionService;
}
