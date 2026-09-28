import "server-only";

import { z } from "zod";

import type { FillerAnalysis } from "@/features/filler-analysis/analyze";
import type { SpeechMetrics } from "@/features/transcription/metrics";
import { segmentSchema } from "@/features/transcription/types";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";

import { type CoachReport, coachReportSchema } from "./schema";

const fillerOccurrenceSchema = z.object({
  filler: z.string(),
  wordIndex: z.number().int().nonnegative(),
  time: z.number().nullable(),
});

/** Loose validation of the stored deterministic metrics blob. */
const storedMetricsSchema = z
  .object({
    totalWords: z.number(),
    totalFillers: z.number(),
    fillerPercent: z.number(),
    perMinute: z.number().nullable(),
    durationSec: z.number().nullable(),
    byFiller: z.array(
      z.object({
        filler: z.string(),
        count: z.number(),
        percentOfWords: z.number(),
        perMinute: z.number().nullable(),
      }),
    ),
    occurrences: z.array(fillerOccurrenceSchema),
    hasTimeline: z.boolean(),
    suggestions: z.array(z.string()),
    speech: z.object({
      wordCount: z.number(),
      durationSec: z.number().nullable(),
      wordsPerMinute: z.number().nullable(),
      longPauses: z.array(z.object({ start: z.number(), end: z.number(), duration: z.number() })),
      longestPauseSec: z.number().nullable(),
      repetitions: z.array(
        z.object({ word: z.string(), wordIndex: z.number(), count: z.number() }),
      ),
      paceScore: z.number().nullable(),
      pauseScore: z.number().nullable(),
    }),
  })
  .passthrough();

export type SessionReport = {
  session: {
    id: string;
    topicText: string;
    mode: string;
    difficulty: string;
    category: string | null;
    targetDurationSec: number;
    elapsedSec: number | null;
    completedAt: Date | null;
    createdAt: Date;
  };
  report: CoachReport;
  fillers: FillerAnalysis;
  speech: SpeechMetrics;
  transcript: { text: string; segments: z.infer<typeof segmentSchema>[] };
  recording: { kind: "VIDEO" | "AUDIO"; mimeType: string } | null;
  provider: string;
  followUps: {
    id: string;
    order: number;
    question: string;
    answerText: string | null;
    score: number | null;
    evaluation: unknown;
  }[];
};

export type ReportResult =
  { ok: true; data: SessionReport } | { ok: false; reason: "not-found" | "not-ready" | "invalid" };

/** Loads a completed session's report for its owner, re-validating stored JSON. */
export async function getSessionReport(userId: string, sessionId: string): Promise<ReportResult> {
  const s = await db.practiceSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      analysis: true,
      transcript: true,
      recording: { select: { kind: true, mimeType: true } },
      followUps: { orderBy: { order: "asc" } },
    },
  });
  if (!s) return { ok: false, reason: "not-found" };
  if (s.status !== "COMPLETED" || !s.analysis || !s.transcript)
    return { ok: false, reason: "not-ready" };

  const report = coachReportSchema.safeParse(s.analysis.report);
  const metrics = storedMetricsSchema.safeParse(s.analysis.fillerAnalysis);
  const segments = z.array(segmentSchema).safeParse(s.transcript.segments);
  if (!report.success || !metrics.success) {
    logger.error("report.invalid_stored_json", {
      sessionId,
      report: report.success ? null : report.error.issues.slice(0, 3),
      metrics: metrics.success ? null : metrics.error.issues.slice(0, 3),
    });
    return { ok: false, reason: "invalid" };
  }
  const { speech, ...fillers } = metrics.data;

  return {
    ok: true,
    data: {
      session: {
        id: s.id,
        topicText: s.topicText,
        mode: s.mode,
        difficulty: s.difficulty,
        category: s.category,
        targetDurationSec: s.targetDurationSec,
        elapsedSec: s.elapsedSec,
        completedAt: s.completedAt,
        createdAt: s.createdAt,
      },
      report: report.data,
      fillers: fillers as unknown as FillerAnalysis,
      speech: speech as SpeechMetrics,
      transcript: { text: s.transcript.text, segments: segments.success ? segments.data : [] },
      recording: s.recording,
      provider: s.analysis.provider,
      followUps: s.followUps.map((f) => ({
        id: f.id,
        order: f.order,
        question: f.question,
        answerText: f.answerText,
        score: f.score,
        evaluation: f.evaluation,
      })),
    },
  };
}
