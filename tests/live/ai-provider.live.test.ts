/**
 * Live provider check — the one thing the mock provider cannot prove.
 *
 * Runs only when real credentials are present, so `npm run test:integration`
 * stays offline-safe:
 *
 *   npm run verify:ai                      # analysis only (a fraction of a cent)
 *   SAMPLE_AUDIO=path/to/speech.webm npm run verify:ai   # also checks transcription
 *
 * It exercises the real OpenAI request/response path: strict JSON-schema output,
 * normalization, and the accuracy rules (deterministic metrics win; unavailable
 * metrics are never invented).
 */
import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeSpeech } from "@/features/ai-coach/coach";
import { coachReportSchema } from "@/features/ai-coach/schema";
import { getTranscriptionService } from "@/features/transcription/service";
import { baseMimeType } from "@/features/recording/constraints";
import type { NormalizedTranscript } from "@/features/transcription/types";

const hasKey = Boolean(process.env.OPENAI_API_KEY);

/** A short answer with deliberate fillers, a repetition and a clear structure. */
const TRANSCRIPT_TEXT =
  "So, um, the biggest challenge I faced was when our launch slipped by three weeks. " +
  "I I had to tell the client myself. Basically, I called them the same morning, explained " +
  "exactly what broke, and gave them two options with dates. We agreed on a phased release. " +
  "The result was that we shipped on the new date and, you know, kept the account.";

const transcript: NormalizedTranscript = {
  text: TRANSCRIPT_TEXT,
  language: "en",
  durationSec: 32,
  segments: [{ start: 0, end: 32, text: TRANSCRIPT_TEXT }],
  words: null,
};

describe.skipIf(!hasKey)("live OpenAI provider", () => {
  beforeAll(() => {
    // The integration config defaults to the mock provider; force the real one.
    process.env.AI_PROVIDER = "openai";
  });

  it("returns a report that satisfies the strict schema", async () => {
    const result = await analyzeSpeech(transcript, {
      topic: "Tell me about a time you had to deliver bad news.",
      category: "BEHAVIORAL",
      mode: "INTERVIEW",
      difficulty: "MEDIUM",
      targetDurationSec: 60,
      elapsedSec: 32,
      withVideo: false,
    });

    expect(result.provider).toBe("openai");
    expect(() => coachReportSchema.parse(result.report)).not.toThrow();

    const { report, speech, fillers } = result;

    // Deterministic measurements win over whatever the model claimed.
    expect(report.dimensions.pace.score).toBe(speech.paceScore);
    expect(report.dimensions.pace.basis).toBe("observed");
    expect(report.dimensions.fillerWords.feedback).toContain("filler words detected");
    expect(fillers.totalFillers).toBeGreaterThan(0);

    // Never invented: there is no video analysis pipeline.
    expect(report.toastmasters.eyeContact.score).toBeNull();
    expect(report.toastmasters.eyeContact.basis).toBe("unavailable");

    // The model actually engaged with the content.
    expect(report.summary.length).toBeGreaterThan(40);
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.homework.length).toBeGreaterThan(0);
    expect(report.summary).not.toMatch(/\[Mock/);

    // Durable evidence of the live run (gitignored).
    await mkdir(".data", { recursive: true });
    await writeFile(
      ".data/live-ai-check.json",
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
          model: result.model,
          overallScore: report.overallScore,
          wordsPerMinute: speech.wordsPerMinute,
          fillersDetected: fillers.totalFillers,
          paceBasis: report.dimensions.pace.basis,
          eyeContact: report.toastmasters.eyeContact,
          summary: report.summary,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          betterWording: report.betterWording,
          nextPractice: report.nextPractice,
        },
        null,
        2,
      ),
      "utf8",
    );

    console.log(
      [
        "",
        `  model:         ${result.model}`,
        `  overall score: ${report.overallScore}`,
        `  wpm / fillers: ${speech.wordsPerMinute} wpm, ${fillers.totalFillers} fillers`,
        `  summary:       ${report.summary.slice(0, 160)}...`,
        `  next practice: ${report.nextPractice.mode} / ${report.nextPractice.focus}`,
        "",
      ].join("\n"),
    );
  }, 120_000);

  it.skipIf(!process.env.SAMPLE_AUDIO)(
    "transcribes a real recording with timestamps",
    async () => {
      const file = path.resolve(process.env.SAMPLE_AUDIO!);
      const bytes = new Uint8Array(await readFile(file));
      const mimeType =
        {
          ".webm": "audio/webm",
          ".m4a": "audio/mp4",
          ".mp4": "video/mp4",
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav",
          ".ogg": "audio/ogg",
        }[path.extname(file).toLowerCase()] ?? "audio/webm";

      const service = getTranscriptionService();
      expect(service.name).toBe("openai");

      const result = await service.transcribe({ audio: bytes, mimeType: baseMimeType(mimeType) });
      expect(result.text.trim().length).toBeGreaterThan(0);
      expect(result.durationSec).toBeGreaterThan(0);

      await mkdir(".data", { recursive: true });
      await writeFile(
        ".data/live-transcription-check.json",
        JSON.stringify(
          {
            checkedAt: new Date().toISOString(),
            model: process.env.OPENAI_TRANSCRIPTION_MODEL,
            file,
            durationSec: result.durationSec,
            wordsWithTimestamps: result.words?.length ?? 0,
            segments: result.segments.length,
            firstWords: result.words?.slice(0, 5) ?? null,
            text: result.text,
          },
          null,
          2,
        ),
        "utf8",
      );

      console.log(
        [
          "",
          `  file:      ${file}`,
          `  duration:  ${result.durationSec}s`,
          `  words:     ${result.words?.length ?? 0} with timestamps`,
          `  segments:  ${result.segments.length}`,
          `  text:      ${result.text.slice(0, 200)}...`,
          "",
        ].join("\n"),
      );
    },
    180_000,
  );
});

describe.skipIf(hasKey)("live OpenAI provider (skipped)", () => {
  it("needs OPENAI_API_KEY in .env", () => {
    console.log("\n  Skipped: set OPENAI_API_KEY in .env to run the live provider check.\n");
    expect(hasKey).toBe(false);
  });
});
