import "server-only";

import { randomUUID } from "node:crypto";

import { analyzeSpeech } from "@/features/ai-coach/coach";
import { processAchievementsAndNotify } from "@/features/achievements/engine";
import {
  ALLOWED_MIME_TYPES,
  baseMimeType,
  containerMatchesMime,
  FILE_EXTENSION,
  isAllowedMimeType,
  MAX_RECORDING_BYTES,
  MAX_TRANSCRIPTION_BYTES,
  MAX_UPLOAD_CHUNKS,
  sniffContainer,
  UPLOAD_CHUNK_BYTES,
} from "@/features/recording/constraints";
import { getTranscriptionService } from "@/features/transcription/service";
import { normalizedTranscriptSchema } from "@/features/transcription/types";
import type { Prisma, SessionStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { AppError, isAppError, notFound } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertSafeKey, getStorage } from "@/lib/storage";
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
  validateMedia(
    kind,
    { size: file.bytes.byteLength, head: file.bytes, mimeType: file.mimeType },
    maxBytes,
  );
}

/** Size, type and magic-byte checks, given the file size and its first bytes. */
function validateMedia(
  kind: "VIDEO" | "AUDIO",
  file: { size: number; head: Uint8Array; mimeType: string },
  maxBytes: number,
) {
  if (file.size === 0) {
    throw new AppError("UPLOAD", "The recording is empty. Please record again.");
  }
  if (file.size > maxBytes) {
    throw new AppError(
      "UPLOAD",
      `The recording is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
    );
  }
  if (!isAllowedMimeType(kind, file.mimeType)) {
    throw new AppError("UPLOAD", "Unsupported recording format.");
  }
  if (!containerMatchesMime(sniffContainer(file.head), file.mimeType)) {
    throw new AppError("UPLOAD", "The file doesn't look like a valid recording.");
  }
}

async function loadUploadableSession(userId: string, sessionId: string, kind: "VIDEO" | "AUDIO") {
  const session = await getOwnedSession(userId, sessionId);
  if (!UPLOADABLE_STATUSES.includes(session.status)) {
    throw new AppError("CONFLICT", "A recording was already submitted for this session.");
  }
  if ((kind === "VIDEO") !== session.withVideo) {
    throw new AppError("UPLOAD", "Recording type doesn't match this session.");
  }
  return session;
}

/** Folder all of a session's recording files live under. */
export function recordingPrefix(userId: string, sessionId: string) {
  return `recordings/${userId}/${sessionId}/`;
}

type StoredFile = { key: string; mimeType: string; size: number };

/** Writes the Recording row and moves the session to PROCESSING (once). */
async function recordUpload(
  session: Awaited<ReturnType<typeof getOwnedSession>>,
  userId: string,
  input: {
    kind: "VIDEO" | "AUDIO";
    durationMs: number;
    elapsedSec: number;
    media: StoredFile;
    audio: StoredFile | null;
  },
) {
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
        mimeType: input.media.mimeType,
        sizeBytes: input.media.size,
        durationMs: input.durationMs || null,
        storageKey: input.media.key,
        audioStorageKey: input.audio?.key ?? null,
        audioMimeType: input.audio?.mimeType ?? null,
        audioSizeBytes: input.audio?.size ?? null,
      },
    });
  });
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
  const session = await loadUploadableSession(userId, sessionId, input.kind);

  validateMediaFile(input.kind, input.media, MAX_RECORDING_BYTES[input.kind]);
  if (input.kind === "AUDIO" && input.media.bytes.byteLength > MAX_TRANSCRIPTION_BYTES) {
    throw new AppError("UPLOAD", "The audio recording is too large to transcribe (max 25 MB).");
  }
  if (input.kind === "VIDEO") {
    if (!input.audio) throw new AppError("UPLOAD", "Missing the audio track for this video.");
    validateMediaFile("AUDIO", input.audio, MAX_TRANSCRIPTION_BYTES);
  }

  const storage = getStorage();
  const prefix = `${recordingPrefix(userId, session.id)}${randomUUID()}`;
  const mediaMime = baseMimeType(input.media.mimeType);
  const storageKey = `${prefix}-media.${FILE_EXTENSION[mediaMime]}`;
  const audioMime = input.audio ? baseMimeType(input.audio.mimeType) : null;
  const audioKey = input.audio && audioMime ? `${prefix}-audio.${FILE_EXTENSION[audioMime]}` : null;

  await storage.put(storageKey, input.media.bytes, mediaMime);
  if (audioKey && input.audio) await storage.put(audioKey, input.audio.bytes, audioMime!);

  try {
    await recordUpload(session, userId, {
      kind: input.kind,
      durationMs: input.durationMs,
      elapsedSec: input.elapsedSec,
      media: { key: storageKey, mimeType: mediaMime, size: input.media.bytes.byteLength },
      audio:
        audioKey && input.audio
          ? { key: audioKey, mimeType: audioMime!, size: input.audio.bytes.byteLength }
          : null,
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

const DIRECT_UPLOAD_NAME = /^[0-9a-f-]{36}-(media|audio)\.([a-z0-9]{2,5})$/;

/**
 * Checks a browser's request to upload a file straight to storage and returns
 * the limits for its upload token. The pathname must sit in the user's own
 * session folder, so a token can never write anywhere else.
 */
export async function authorizeRecordingUpload(
  userId: string,
  sessionId: string,
  pathname: string,
) {
  const prefix = recordingPrefix(userId, sessionId);
  const match = pathname.startsWith(prefix)
    ? DIRECT_UPLOAD_NAME.exec(pathname.slice(prefix.length))
    : null;
  if (!match) throw new AppError("VALIDATION", "Invalid upload path.");
  const [, role, ext] = match;

  const session = await getOwnedSession(userId, sessionId);
  if (!UPLOADABLE_STATUSES.includes(session.status)) {
    throw new AppError("CONFLICT", "A recording was already submitted for this session.");
  }
  if (role === "audio" && !session.withVideo) {
    throw new AppError("UPLOAD", "Recording type doesn't match this session.");
  }
  const kind = role === "media" && session.withVideo ? "VIDEO" : "AUDIO";
  const allowedContentTypes = ALLOWED_MIME_TYPES[kind].filter(
    (mime) => FILE_EXTENSION[mime] === ext,
  );
  if (allowedContentTypes.length === 0) {
    throw new AppError("UPLOAD", "Unsupported recording format.");
  }
  return {
    allowedContentTypes,
    maximumSizeInBytes: kind === "VIDEO" ? MAX_RECORDING_BYTES.VIDEO : MAX_TRANSCRIPTION_BYTES,
  };
}

async function readHead(key: string, length: number): Promise<Uint8Array> {
  const stream = await getStorage().openRead(key, { start: 0, end: length - 1 });
  return new Uint8Array(await new Response(stream).arrayBuffer()).subarray(0, length);
}

// ── Uploads in parts ─────────────────────────────────────────────────────────
// Large recordings can upload through the server in pieces below Vercel's
// ~4.5 MB request limit, then get joined into one file. This needs no browser
// upload token, so it works however the storage is connected.

const UPLOAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type UploadRole = "media" | "audio";

function chunkKey(prefix: string, uploadId: string, role: UploadRole, index: number) {
  return `${prefix}${uploadId}-${role}-${index}.part`;
}

function assertChunkRef(uploadId: string, role: string, index: number) {
  if (
    !UPLOAD_ID.test(uploadId) ||
    (role !== "media" && role !== "audio") ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= MAX_UPLOAD_CHUNKS
  ) {
    throw new AppError("VALIDATION", "Invalid upload part.");
  }
}

/** Stores one piece of a recording that is uploading in parts. */
export async function storeRecordingChunk(
  userId: string,
  sessionId: string,
  input: { uploadId: string; role: string; index: number; bytes: Uint8Array },
) {
  assertChunkRef(input.uploadId, input.role, input.index);
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > UPLOAD_CHUNK_BYTES) {
    throw new AppError("UPLOAD", "Invalid upload part size.");
  }
  const session = await getOwnedSession(userId, sessionId);
  if (!UPLOADABLE_STATUSES.includes(session.status)) {
    throw new AppError("CONFLICT", "A recording was already submitted for this session.");
  }
  if (input.role === "audio" && !session.withVideo) {
    throw new AppError("UPLOAD", "Recording type doesn't match this session.");
  }
  const key = chunkKey(
    recordingPrefix(userId, sessionId),
    input.uploadId,
    input.role as UploadRole,
    input.index,
  );
  await getStorage().put(key, input.bytes, "application/octet-stream");
}

export type ChunkedFile = { uploadId: string; parts: number; mimeType: string };

/** Joins a file's parts into one stored file and removes the parts. */
async function assembleChunkedFile(
  userId: string,
  sessionId: string,
  role: UploadRole,
  file: ChunkedFile,
  maxBytes: number,
): Promise<{ key: string; mimeType: string }> {
  if (!Number.isInteger(file.parts) || file.parts < 1 || file.parts > MAX_UPLOAD_CHUNKS) {
    throw new AppError("VALIDATION", "Invalid upload.");
  }
  assertChunkRef(file.uploadId, role, file.parts - 1);
  const mimeType = baseMimeType(file.mimeType);
  const ext = FILE_EXTENSION[mimeType];
  if (!ext) throw new AppError("UPLOAD", "Unsupported recording format.");

  const prefix = recordingPrefix(userId, sessionId);
  const storage = getStorage();
  const keys = Array.from({ length: file.parts }, (_, i) =>
    chunkKey(prefix, file.uploadId, role, i),
  );
  try {
    const sizes = await Promise.all(keys.map((k) => storage.stat(k)));
    if (sizes.some((s) => !s)) {
      throw new AppError("UPLOAD", "The upload didn't finish. Please try again.");
    }
    const total = sizes.reduce((sum, s) => sum + s!.size, 0);
    if (total > maxBytes) {
      throw new AppError(
        "UPLOAD",
        `The recording is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
      );
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const k of keys) {
      const part = await storage.get(k);
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    const key = `${prefix}${file.uploadId}-${role}.${ext}`;
    await storage.put(key, bytes, mimeType);
    return { key, mimeType };
  } finally {
    await Promise.allSettled(keys.map((k) => storage.delete(k)));
  }
}

type FileRef = { key: string; mimeType: string } | ChunkedFile;

/**
 * Attaches a recording that is already in storage: either uploaded straight to
 * storage by the browser, or uploaded in parts (which are joined first).
 */
export async function attachRecordingUpload(
  userId: string,
  sessionId: string,
  input: {
    kind: "VIDEO" | "AUDIO";
    media: FileRef;
    audio?: FileRef | null;
    durationMs: number;
    elapsedSec: number;
  },
) {
  // Check first, so a repeated submit gets a clear conflict, not a missing-parts error.
  await loadUploadableSession(userId, sessionId, input.kind);
  const resolve = async (ref: FileRef, role: UploadRole, maxBytes: number) =>
    "key" in ref ? ref : assembleChunkedFile(userId, sessionId, role, ref, maxBytes);
  const media = await resolve(
    input.media,
    "media",
    input.kind === "AUDIO" ? MAX_TRANSCRIPTION_BYTES : MAX_RECORDING_BYTES.VIDEO,
  );
  let audio: { key: string; mimeType: string } | null = null;
  try {
    if (input.audio) audio = await resolve(input.audio, "audio", MAX_TRANSCRIPTION_BYTES);
  } catch (error) {
    if (!("key" in input.media))
      await getStorage()
        .delete(media.key)
        .catch(() => {});
    throw error;
  }
  await attachStoredRecording(userId, sessionId, { ...input, media, audio });
}

/**
 * Attaches files the browser already uploaded straight to storage (used on
 * Vercel, where request bodies are capped at ~4.5 MB). Each file gets the same
 * checks as a server upload; on failure the files are deleted.
 */
export async function attachStoredRecording(
  userId: string,
  sessionId: string,
  input: {
    kind: "VIDEO" | "AUDIO";
    media: { key: string; mimeType: string };
    audio?: { key: string; mimeType: string } | null;
    durationMs: number;
    elapsedSec: number;
  },
) {
  const prefix = recordingPrefix(userId, sessionId);
  const files = input.audio ? [input.media, input.audio] : [input.media];
  for (const f of files) {
    if (!f.key.startsWith(prefix)) throw new AppError("VALIDATION", "Invalid recording reference.");
    assertSafeKey(f.key);
  }
  const storage = getStorage();

  const inspect = async (
    f: { key: string; mimeType: string },
    kind: "VIDEO" | "AUDIO",
    maxBytes: number,
  ): Promise<StoredFile> => {
    const info = await storage.stat(f.key);
    if (!info) throw new AppError("UPLOAD", "The upload didn't finish. Please try again.");
    const mimeType = baseMimeType(f.mimeType);
    if (FILE_EXTENSION[mimeType] !== f.key.slice(f.key.lastIndexOf(".") + 1)) {
      throw new AppError("UPLOAD", "Unsupported recording format.");
    }
    const head = info.size > 0 ? await readHead(f.key, Math.min(info.size, 16)) : new Uint8Array();
    validateMedia(kind, { size: info.size, head, mimeType }, maxBytes);
    return { key: f.key, mimeType, size: info.size };
  };

  try {
    const session = await loadUploadableSession(userId, sessionId, input.kind);
    if (input.kind === "VIDEO" && !input.audio) {
      throw new AppError("UPLOAD", "Missing the audio track for this video.");
    }
    if (input.kind === "AUDIO" && input.audio) {
      throw new AppError("UPLOAD", "Recording type doesn't match this session.");
    }
    const media = await inspect(
      input.media,
      input.kind,
      input.kind === "AUDIO" ? MAX_TRANSCRIPTION_BYTES : MAX_RECORDING_BYTES.VIDEO,
    );
    const audio = input.audio ? await inspect(input.audio, "AUDIO", MAX_TRANSCRIPTION_BYTES) : null;
    await recordUpload(session, userId, { ...input, media, audio });
  } catch (error) {
    // On a conflict another submit already won and may own these files; keep them.
    if (!(isAppError(error) && error.code === "CONFLICT")) {
      await Promise.allSettled(files.map((f) => storage.delete(f.key)));
    }
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
