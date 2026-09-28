import "server-only";

import { randomUUID } from "node:crypto";

import { analyzeSpeech } from "@/features/ai-coach/coach";
import { processAchievementsAndNotify } from "@/features/achievements/engine";
import {
  baseMimeType,
  containerMatchesMime,
  FILE_EXTENSION,
  isAllowedMimeType,
  MAX_RECORDING_BYTES,
  MAX_TRANSCRIPTION_BYTES,
  sniffContainer,
} from "@/features/recording/constraints";
import { getTranscriptionService } from "@/features/transcription/service";
import { normalizedTranscriptSchema } from "@/features/transcription/types";
import type { Prisma, SessionStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { AppError, isAppError, notFound } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import type { CreateSessionInput } from "@/lib/validation/practice";

import { canTransition, retryFrom, UPLOADABLE_STATUSES } from "./state-machine";

/** Loads a session owned by the user or throws NOT_FOUND (never reveals others' sessions). */
export async function getOwnedSession(userId: string, sessionId: string) {
  const session = await db.practiceSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw notFound("Session");
  return session;
}

export async function createPracticeSession(userId: string, input: CreateSessionInput) {
  const topic = await db.topic.findFirst({
    where: { id: input.topicId, isActive: true },
    select: { id: true, text: true, category: true },
  });
  if (!topic) throw notFound("Topic");
  return db.practiceSession.create({
    data: {
      userId,
      topicId: topic.id,
      topicText: topic.text,
      category: topic.category,
      mode: input.mode,
      difficulty: input.difficulty,
      targetDurationSec: input.targetDurationSec,
      withVideo: input.withVideo,
      status: "READY",
    },
    select: { id: true },
  });
}

/**
 * Atomically moves a session between states. The conditional update guards
 * against races (e.g. a double-submitted retry) without explicit locks.
 */
export async function transition(
  sessionId: string,
  from: SessionStatus | readonly SessionStatus[],
  to: SessionStatus,
  data: Prisma.PracticeSessionUpdateManyMutationInput = {},
): Promise<boolean> {
  const fromList = (Array.isArray(from) ? from : [from]) as SessionStatus[];
  const allowed = fromList.filter((f) => canTransition(f, to));
  if (!allowed.length) return false;
  const { count } = await db.practiceSession.updateMany({
    where: { id: sessionId, status: { in: allowed } },
    data: { ...data, status: to },
  });
  return count === 1;
}

export async function applySessionEvent(
  userId: string,
  sessionId: string,
  event: "countdown" | "start" | "restart" | "cancel" | "voice-only",
) {
  const session = await getOwnedSession(userId, sessionId);
  if (event === "voice-only") {
    // Camera unavailable/denied: continue the same session with audio only.
    const { count } = await db.practiceSession.updateMany({
      where: { id: session.id, userId, status: { in: ["DRAFT", "READY", "COUNTDOWN"] } },
      data: { withVideo: false, status: "READY", startedAt: null },
    });
    if (count !== 1) {
      throw new AppError("CONFLICT", "This session can't switch to voice only right now.");
    }
    return "READY" as const;
  }
  const plan: Record<
    Exclude<typeof event, "voice-only">,
    { to: SessionStatus; data?: Prisma.PracticeSessionUpdateManyMutationInput }
  > = {
    countdown: { to: "COUNTDOWN" },
    start: { to: "RECORDING", data: { startedAt: new Date() } },
    restart: { to: "READY", data: { startedAt: null, elapsedSec: null } },
    cancel: { to: "CANCELLED" },
  };
  const { to, data } = plan[event];
  if (session.status === to) return session.status;
  const ok = await transition(session.id, session.status, to, data);
  if (!ok) {
    throw new AppError(
      "CONFLICT",
      `This session can't ${event} right now (it is ${session.status.toLowerCase()}).`,
    );
  }
  return to;
}

export type UploadedFile = { bytes: Uint8Array; mimeType: string };

export function validateMediaFile(kind: "VIDEO" | "AUDIO", file: UploadedFile, maxBytes: number) {
  if (file.bytes.byteLength === 0) {
    throw new AppError("UPLOAD", "The recording is empty. Please record again.");
  }
  if (file.bytes.byteLength > maxBytes) {
    throw new AppError(
      "UPLOAD",
      `The recording is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
    );
  }
  if (!isAllowedMimeType(kind, file.mimeType)) {
    throw new AppError("UPLOAD", "Unsupported recording format.");
  }
  if (!containerMatchesMime(sniffContainer(file.bytes), file.mimeType)) {
    throw new AppError("UPLOAD", "The file doesn't look like a valid recording.");
  }
}

/**
 * Stores the recording and moves the session to PROCESSING. For video sessions
 * a separate audio track (used for transcription) is required.
 */
export async function saveRecording(
  userId: string,
  sessionId: string,
  input: {
    kind: "VIDEO" | "AUDIO";
    media: UploadedFile;
    audio?: UploadedFile | null;
    durationMs: number;
    elapsedSec: number;
  },
) {
  const session = await getOwnedSession(userId, sessionId);
  if (!UPLOADABLE_STATUSES.includes(session.status)) {
    throw new AppError("CONFLICT", "A recording was already submitted for this session.");
  }
  if ((input.kind === "VIDEO") !== session.withVideo) {
    throw new AppError("UPLOAD", "Recording type doesn't match this session.");
  }

  validateMediaFile(input.kind, input.media, MAX_RECORDING_BYTES[input.kind]);
  if (input.kind === "AUDIO" && input.media.bytes.byteLength > MAX_TRANSCRIPTION_BYTES) {
    throw new AppError("UPLOAD", "The audio recording is too large to transcribe (max 25 MB).");
  }
  if (input.kind === "VIDEO") {
    if (!input.audio) throw new AppError("UPLOAD", "Missing the audio track for this video.");
    validateMediaFile("AUDIO", input.audio, MAX_TRANSCRIPTION_BYTES);
  }

  const storage = getStorage();
  const prefix = `recordings/${userId}/${session.id}/${randomUUID()}`;
  const mediaMime = baseMimeType(input.media.mimeType);
  const storageKey = `${prefix}-media.${FILE_EXTENSION[mediaMime]}`;
  const audioMime = input.audio ? baseMimeType(input.audio.mimeType) : null;
  const audioKey = input.audio && audioMime ? `${prefix}-audio.${FILE_EXTENSION[audioMime]}` : null;

  await storage.put(storageKey, input.media.bytes, mediaMime);
  if (audioKey && input.audio) await storage.put(audioKey, input.audio.bytes, audioMime!);

  try {
    await db.$transaction(async (tx) => {
      const moved = await tx.practiceSession.updateMany({
        where: { id: session.id, userId, status: { in: [...UPLOADABLE_STATUSES] } },
        data: {
          status: "PROCESSING",
          elapsedSec: input.elapsedSec,
          startedAt: session.startedAt ?? new Date(Date.now() - input.elapsedSec * 1000),
        },
      });
      if (moved.count !== 1)
        throw new AppError("CONFLICT", "A recording was already submitted for this session.");
      await tx.recording.create({
        data: {
          sessionId: session.id,
          userId,
          kind: input.kind,
          mimeType: mediaMime,
          sizeBytes: input.media.bytes.byteLength,
          durationMs: input.durationMs || null,
          storageKey,
          audioStorageKey: audioKey,
          audioMimeType: audioMime,
          audioSizeBytes: input.audio?.bytes.byteLength ?? null,
        },
      });
    });
  } catch (error) {
    // Don't leave orphaned files when the database write fails.
    await Promise.allSettled([
      storage.delete(storageKey),
      audioKey ? storage.delete(audioKey) : null,
    ]);
    throw error;
  }
}

function safeFailureReason(error: unknown, fallback: string): string {
  return (isAppError(error) ? error.message : fallback).slice(0, 300);
}

/**
 * Runs transcription and analysis for a session in PROCESSING (or resumes a
 * failed one). Idempotent: completed steps are skipped, and each state change
 * is a guarded transition so concurrent runs can't double-process.
 */
export async function processSession(sessionId: string): Promise<SessionStatus> {
  const session = await db.practiceSession.findUnique({
    where: { id: sessionId },
    include: { recording: true, transcript: { select: { id: true } } },
  });
  if (!session) throw notFound("Session");

  // ── Transcription ──
  if (!session.transcript) {
    const claimed = await transition(
      session.id,
      ["PROCESSING", "PROCESSING_FAILED", "TRANSCRIPTION_FAILED"],
      "TRANSCRIBING",
      { failureReason: null },
    );
    if (!claimed) {
      const current = await db.practiceSession.findUnique({
        where: { id: session.id },
        select: { status: true },
      });
      return current?.status ?? session.status;
    }
    try {
      if (!session.recording)
        throw new AppError("TRANSCRIPTION", "No recording was found for this session.");
      const key = session.recording.audioStorageKey ?? session.recording.storageKey;
      const mime = session.recording.audioMimeType ?? session.recording.mimeType;
      const audio = await getStorage().get(key);
      const transcript = normalizedTranscriptSchema.parse(
        await getTranscriptionService().transcribe({
          audio,
          mimeType: mime,
          prompt: session.topicText,
        }),
      );
      await db.transcript.create({
        data: {
          sessionId: session.id,
          text: transcript.text,
          language: transcript.language,
          durationSec:
            transcript.durationSec ??
            (session.recording.durationMs ? session.recording.durationMs / 1000 : null),
          segments: transcript.segments,
          words: transcript.words ?? undefined,
          provider: getTranscriptionService().name,
        },
      });
      await transition(session.id, "TRANSCRIBING", "ANALYZING");
    } catch (error) {
      logger.error("session.transcription_failed", { sessionId: session.id, error });
      await transition(session.id, "TRANSCRIBING", "TRANSCRIPTION_FAILED", {
        failureReason: safeFailureReason(error, "We couldn't transcribe your recording."),
      });
      return "TRANSCRIPTION_FAILED";
    }
  } else {
    const claimed = await transition(session.id, ["ANALYSIS_FAILED", "TRANSCRIBING"], "ANALYZING", {
      failureReason: null,
    });
    if (!claimed) {
      const current = await db.practiceSession.findUnique({
        where: { id: session.id },
        select: { status: true },
      });
      if (current?.status !== "ANALYZING") return current?.status ?? session.status;
    }
  }

  // ── Analysis ──
  try {
    const fresh = await db.practiceSession.findUniqueOrThrow({
      where: { id: session.id },
      include: { transcript: true, analysis: { select: { id: true } } },
    });
    if (!fresh.analysis) {
      const t = fresh.transcript!;
      const transcript = normalizedTranscriptSchema.parse({
        text: t.text,
        language: t.language,
        durationSec: t.durationSec,
        segments: t.segments,
        words: t.words ?? null,
      });
      const result = await analyzeSpeech(transcript, {
        topic: fresh.topicText,
        category: fresh.category,
        mode: fresh.mode,
        difficulty: fresh.difficulty,
        targetDurationSec: fresh.targetDurationSec,
        elapsedSec: fresh.elapsedSec,
        withVideo: fresh.withVideo,
      });
      const { report, fillers, speech } = result;
      await db.speakingAnalysis.create({
        data: {
          sessionId: fresh.id,
          overallScore: report.overallScore,
          confidenceScore: report.dimensions.confidence.score ?? report.overallScore,
          grammarScore: report.dimensions.grammar.score ?? report.overallScore,
          clarityScore: report.dimensions.clarity.score ?? report.overallScore,
          wordsPerMinute: speech.wordsPerMinute,
          wordCount: speech.wordCount,
          fillerCount: fillers.totalFillers,
          fillerPerMinute: fillers.perMinute ?? 0,
          longPauseCount: speech.longPauses.length,
          report: report as unknown as Prisma.InputJsonValue,
          fillerAnalysis: { ...fillers, speech } as unknown as Prisma.InputJsonValue,
          provider: result.provider,
          model: result.model,
        },
      });
    }
    const done = await transition(fresh.id, "ANALYZING", "COMPLETED", { completedAt: new Date() });
    if (done) {
      // Respect the privacy preference: drop raw media once analysis is stored.
      const prefs = await db.userPreferences.findUnique({
        where: { userId: fresh.userId },
        select: { keepRecordings: true },
      });
      if (prefs && !prefs.keepRecordings) {
        try {
          await deleteSessionRecording(fresh.userId, fresh.id);
        } catch (error) {
          logger.error("recording.auto_delete_failed", { sessionId: fresh.id, error });
        }
      }
      try {
        await processAchievementsAndNotify(fresh.userId, fresh.id);
      } catch (error) {
        // Achievements are recomputed on the next completion; never fail the session for them.
        logger.error("achievements.processing_failed", { sessionId: fresh.id, error });
      }
    }
    return "COMPLETED";
  } catch (error) {
    logger.error("session.analysis_failed", { sessionId: session.id, error });
    await transition(session.id, "ANALYZING", "ANALYSIS_FAILED", {
      failureReason: safeFailureReason(error, "The AI coach couldn't analyze this session."),
    });
    return "ANALYSIS_FAILED";
  }
}

export async function retrySessionProcessing(userId: string, sessionId: string) {
  const session = await getOwnedSession(userId, sessionId);
  if (!retryFrom(session.status)) {
    throw new AppError("CONFLICT", "This session doesn't need to be retried.");
  }
  return session.id;
}

/** Deletes a session and its stored media. Ownership enforced. */
export async function deleteSession(userId: string, sessionId: string) {
  const session = await db.practiceSession.findFirst({
    where: { id: sessionId, userId },
    include: { recording: true },
  });
  if (!session) throw notFound("Session");
  await db.practiceSession.delete({ where: { id: session.id } });
  if (session.recording) await deleteRecordingFiles(session.recording);
}

/** Deletes only the stored media for a session, keeping transcript and report. */
export async function deleteSessionRecording(userId: string, sessionId: string) {
  const recording = await db.recording.findFirst({ where: { sessionId, userId } });
  if (!recording) throw notFound("Recording");
  await db.recording.delete({ where: { id: recording.id } });
  await deleteRecordingFiles(recording);
}

async function deleteRecordingFiles(r: { storageKey: string; audioStorageKey: string | null }) {
  const storage = getStorage();
  const results = await Promise.allSettled([
    storage.delete(r.storageKey),
    r.audioStorageKey ? storage.delete(r.audioStorageKey) : Promise.resolve(),
  ]);
  for (const res of results) {
    if (res.status === "rejected") logger.error("storage.delete_failed", { error: res.reason });
  }
}
