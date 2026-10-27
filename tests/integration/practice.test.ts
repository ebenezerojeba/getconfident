import { processAchievementsForSession } from "@/features/achievements/engine";
import {
  applySessionEvent,
  attachStoredRecording,
  authorizeRecordingUpload,
  createPracticeSession,
  deleteSession,
  deleteSessionRecording,
  getOwnedSession,
  processSession,
  recordingPrefix,
  retrySessionProcessing,
  saveRecording,
} from "@/features/practice/service";
import { getRandomTopic } from "@/features/topics/service";
import { mockTranscriptionService } from "@/features/transcription/service";
import { db } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";

import { createTestUser, ensureSeedData } from "../support/factories";

/** Minimal bytes that pass container sniffing (EBML header for WebM). */
const webm = (size = 2048) => {
  const b = new Uint8Array(size);
  b.set([0x1a, 0x45, 0xdf, 0xa3]);
  return b;
};

beforeAll(async () => {
  await ensureSeedData();
});

async function newSession(userId: string, withVideo = false) {
  const topic = await getRandomTopic(userId, { difficulty: "EASY" });
  return createPracticeSession(userId, {
    topicId: topic.id,
    mode: "IMPROMPTU",
    difficulty: "EASY",
    targetDurationSec: 60,
    withVideo,
  });
}

async function uploadAudio(userId: string, sessionId: string) {
  await saveRecording(userId, sessionId, {
    kind: "AUDIO",
    media: { bytes: webm(), mimeType: "audio/webm;codecs=opus" },
    durationMs: 55_000,
    elapsedSec: 55,
  });
}

describe("ownership & authorization", () => {
  it("never exposes another user's session", async () => {
    const alice = await createTestUser();
    const mallory = await createTestUser();
    const { id } = await newSession(alice.id);

    await expect(getOwnedSession(mallory.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(applySessionEvent(mallory.id, id, "start")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(uploadAudio(mallory.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteSession(mallory.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(retrySessionProcessing(mallory.id, id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Alice's session is untouched.
    expect((await getOwnedSession(alice.id, id)).status).toBe("READY");
  });

  it("refuses to delete another user's recording", async () => {
    const alice = await createTestUser();
    const mallory = await createTestUser();
    const { id } = await newSession(alice.id);
    await uploadAudio(alice.id, id);
    await expect(deleteSessionRecording(mallory.id, id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await db.recording.count({ where: { sessionId: id } })).toBe(1);
  });
});

describe("session lifecycle", () => {
  it("rejects unknown topics", async () => {
    const user = await createTestUser();
    await expect(
      createPracticeSession(user.id, {
        topicId: "doesnotexist",
        mode: "IMPROMPTU",
        difficulty: "EASY",
        targetDurationSec: 60,
        withVideo: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("snapshots the topic and follows countdown → recording → restart", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    const s = await getOwnedSession(user.id, id);
    expect(s.topicText.length).toBeGreaterThan(5);
    expect(await applySessionEvent(user.id, id, "countdown")).toBe("COUNTDOWN");
    expect(await applySessionEvent(user.id, id, "start")).toBe("RECORDING");
    expect((await getOwnedSession(user.id, id)).startedAt).not.toBeNull();
    expect(await applySessionEvent(user.id, id, "restart")).toBe("READY");
    expect(await applySessionEvent(user.id, id, "cancel")).toBe("CANCELLED");
    await expect(applySessionEvent(user.id, id, "start")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("upload validation", () => {
  it("rejects empty, oversized, mistyped and disguised files", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    const base = { kind: "AUDIO" as const, durationMs: 1000, elapsedSec: 1 };

    await expect(
      saveRecording(user.id, id, {
        ...base,
        media: { bytes: new Uint8Array(), mimeType: "audio/webm" },
      }),
    ).rejects.toMatchObject({ code: "UPLOAD" });
    await expect(
      saveRecording(user.id, id, {
        ...base,
        media: { bytes: webm(26 * 1024 * 1024), mimeType: "audio/webm" },
      }),
    ).rejects.toMatchObject({ code: "UPLOAD" });
    await expect(
      saveRecording(user.id, id, {
        ...base,
        media: { bytes: webm(), mimeType: "application/pdf" },
      }),
    ).rejects.toMatchObject({ code: "UPLOAD" });
    const pdf = new Uint8Array(2048);
    pdf.set([0x25, 0x50, 0x44, 0x46]);
    await expect(
      saveRecording(user.id, id, { ...base, media: { bytes: pdf, mimeType: "audio/webm" } }),
    ).rejects.toMatchObject({ code: "UPLOAD" });

    // Kind must match the session (voice session can't receive video).
    await expect(
      saveRecording(user.id, id, {
        ...base,
        kind: "VIDEO",
        media: { bytes: webm(), mimeType: "video/webm" },
      }),
    ).rejects.toMatchObject({ code: "UPLOAD" });
  });

  it("requires an audio track for video sessions and stores both", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id, true);
    const base = { kind: "VIDEO" as const, durationMs: 1000, elapsedSec: 1 };
    await expect(
      saveRecording(user.id, id, { ...base, media: { bytes: webm(), mimeType: "video/webm" } }),
    ).rejects.toMatchObject({ code: "UPLOAD" });

    await saveRecording(user.id, id, {
      ...base,
      media: { bytes: webm(4096), mimeType: "video/webm;codecs=vp8,opus" },
      audio: { bytes: webm(1024), mimeType: "audio/webm" },
    });
    const rec = await db.recording.findUniqueOrThrow({ where: { sessionId: id } });
    expect(rec.kind).toBe("VIDEO");
    expect(rec.audioStorageKey).toBeTruthy();
    expect(await getStorage().exists(rec.storageKey)).toBe(true);
    expect(await getStorage().exists(rec.audioStorageKey!)).toBe(true);
    expect((await getOwnedSession(user.id, id)).status).toBe("PROCESSING");
  });

  it("does not accept a second recording", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    await uploadAudio(user.id, id);
    await expect(uploadAudio(user.id, id)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("processing pipeline (mock provider)", () => {
  it("transcribes, analyzes, completes and unlocks FIRST_PRACTICE once", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    await uploadAudio(user.id, id);

    expect(await processSession(id)).toBe("COMPLETED");
    const s = await db.practiceSession.findUniqueOrThrow({
      where: { id },
      include: { transcript: true, analysis: true },
    });
    expect(s.status).toBe("COMPLETED");
    expect(s.completedAt).not.toBeNull();
    expect(s.transcript?.text.length).toBeGreaterThan(50);
    expect(s.analysis?.fillerCount).toBeGreaterThan(0);
    expect(s.analysis?.overallScore).toBeGreaterThanOrEqual(0);
    expect(s.analysis?.provider).toBe("mock");

    const unlocked = await db.userAchievement.findMany({ where: { userId: user.id } });
    expect(unlocked.map((u) => u.achievementId)).toContain("FIRST_PRACTICE");

    // Idempotent: reprocessing and re-running achievements create nothing new.
    expect(await processSession(id)).toBe("COMPLETED");
    expect(await processAchievementsForSession(user.id, id)).toEqual([]);
    expect(await db.userAchievement.count({ where: { userId: user.id } })).toBe(unlocked.length);
    expect(await db.notification.count({ where: { userId: user.id, type: "ACHIEVEMENT" } })).toBe(
      unlocked.length,
    );
    expect(await db.speakingAnalysis.count({ where: { sessionId: id } })).toBe(1);
  });

  it("marks transcription failures and recovers on retry", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    await uploadAudio(user.id, id);

    const original = mockTranscriptionService.transcribe;
    mockTranscriptionService.transcribe = async () => {
      throw new Error("provider down");
    };
    try {
      expect(await processSession(id)).toBe("TRANSCRIPTION_FAILED");
    } finally {
      mockTranscriptionService.transcribe = original;
    }
    const failed = await getOwnedSession(user.id, id);
    expect(failed.failureReason).toBe("We couldn't transcribe your recording.");

    await retrySessionProcessing(user.id, id);
    expect(await processSession(id)).toBe("COMPLETED");
    expect((await getOwnedSession(user.id, id)).failureReason).toBeNull();
  });

  it("fails analysis gracefully for near-silent recordings", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    await uploadAudio(user.id, id);
    const original = mockTranscriptionService.transcribe;
    mockTranscriptionService.transcribe = async () => ({
      text: "um",
      language: "en",
      durationSec: 3,
      segments: [],
      words: null,
    });
    try {
      expect(await processSession(id)).toBe("ANALYSIS_FAILED");
    } finally {
      mockTranscriptionService.transcribe = original;
    }
    expect((await getOwnedSession(user.id, id)).failureReason).toMatch(
      /couldn't hear enough speech/,
    );
  });

  it("deletes a session with its files, or just the recording", async () => {
    const user = await createTestUser();
    const a = await newSession(user.id);
    await uploadAudio(user.id, a.id);
    const recA = await db.recording.findUniqueOrThrow({ where: { sessionId: a.id } });
    await deleteSessionRecording(user.id, a.id);
    expect(await getStorage().exists(recA.storageKey)).toBe(false);
    expect(await db.practiceSession.count({ where: { id: a.id } })).toBe(1);

    const b = await newSession(user.id);
    await uploadAudio(user.id, b.id);
    const recB = await db.recording.findUniqueOrThrow({ where: { sessionId: b.id } });
    await deleteSession(user.id, b.id);
    expect(await db.practiceSession.count({ where: { id: b.id } })).toBe(0);
    expect(await getStorage().exists(recB.storageKey)).toBe(false);
  });
});

describe("direct-to-storage uploads", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";

  it("only authorizes paths in the user's own session folder", async () => {
    const alice = await createTestUser();
    const mallory = await createTestUser();
    const { id } = await newSession(alice.id);
    const own = `${recordingPrefix(alice.id, id)}${uuid}-media.webm`;

    await expect(authorizeRecordingUpload(alice.id, id, own)).resolves.toMatchObject({
      allowedContentTypes: ["audio/webm"],
      maximumSizeInBytes: 25 * 1024 * 1024,
    });
    // Someone else's session, a foreign folder, or a made-up name are all refused.
    await expect(authorizeRecordingUpload(mallory.id, id, own)).rejects.toBeTruthy();
    await expect(
      authorizeRecordingUpload(alice.id, id, `recordings/${mallory.id}/${id}/${uuid}-media.webm`),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      authorizeRecordingUpload(alice.id, id, `${recordingPrefix(alice.id, id)}../x-media.webm`),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    // Voice sessions have no separate audio track.
    await expect(
      authorizeRecordingUpload(alice.id, id, `${recordingPrefix(alice.id, id)}${uuid}-audio.webm`),
    ).rejects.toMatchObject({ code: "UPLOAD" });
  });

  it("attaches stored files after checking them, and deletes bad ones", async () => {
    const user = await createTestUser();
    const { id } = await newSession(user.id);
    const storage = getStorage();
    const base = { kind: "AUDIO" as const, durationMs: 1000, elapsedSec: 1 };

    const badKey = `${recordingPrefix(user.id, id)}${uuid}-media.webm`;
    await storage.put(badKey, new Uint8Array(64), "audio/webm"); // no WebM header
    await expect(
      attachStoredRecording(user.id, id, {
        ...base,
        media: { key: badKey, mimeType: "audio/webm" },
      }),
    ).rejects.toMatchObject({ code: "UPLOAD" });
    expect(await storage.exists(badKey)).toBe(false);

    await expect(
      attachStoredRecording(user.id, id, {
        ...base,
        media: { key: `recordings/other/${id}/${uuid}-media.webm`, mimeType: "audio/webm" },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const key = `${recordingPrefix(user.id, id)}${uuid.replace("1", "2")}-media.webm`;
    await storage.put(key, webm(), "audio/webm");
    await attachStoredRecording(user.id, id, {
      ...base,
      media: { key, mimeType: "audio/webm;codecs=opus" },
    });
    const rec = await db.recording.findUniqueOrThrow({ where: { sessionId: id } });
    expect(rec).toMatchObject({ storageKey: key, mimeType: "audio/webm", sizeBytes: 2048 });
    expect((await getOwnedSession(user.id, id)).status).toBe("PROCESSING");

    // A repeated submit conflicts but leaves the attached file alone.
    await expect(
      attachStoredRecording(user.id, id, { ...base, media: { key, mimeType: "audio/webm" } }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await storage.exists(key)).toBe(true);
  });
});
