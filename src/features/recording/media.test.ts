import {
  checkRecordingSupport,
  classifyMediaError,
  MEDIA_ERROR_MESSAGES,
  pickMimeType,
} from "./media";

describe("classifyMediaError", () => {
  it.each([
    ["NotAllowedError", "permission-denied"],
    ["SecurityError", "permission-denied"],
    ["NotFoundError", "no-device"],
    ["OverconstrainedError", "no-device"],
    ["NotReadableError", "device-busy"],
    ["AbortError", "device-busy"],
    ["WeirdError", "unknown"],
  ])("%s → %s", (name, kind) => {
    expect(classifyMediaError({ name })).toBe(kind);
  });

  it("handles non-errors", () => {
    expect(classifyMediaError(null)).toBe("unknown");
    expect(classifyMediaError("boom")).toBe("unknown");
  });

  it("has a user message for every kind", () => {
    for (const kind of [
      "permission-denied",
      "no-device",
      "device-busy",
      "insecure-context",
      "unsupported",
      "unknown",
    ] as const) {
      expect(MEDIA_ERROR_MESSAGES[kind].title).toBeTruthy();
    }
  });
});

describe("pickMimeType", () => {
  it("prefers the first supported candidate", () => {
    expect(pickMimeType("video", (t) => t.startsWith("video/webm"))).toBe(
      "video/webm;codecs=vp9,opus",
    );
    expect(pickMimeType("audio", (t) => t === "audio/mp4")).toBe("audio/mp4");
  });
  it("supports Safari-style mp4-only recording", () => {
    expect(pickMimeType("video", (t) => t.startsWith("video/mp4"))).toBe(
      "video/mp4;codecs=avc1,mp4a",
    );
  });
  it("returns null when nothing is supported or the check throws", () => {
    expect(pickMimeType("audio", () => false)).toBeNull();
    expect(
      pickMimeType("audio", () => {
        throw new Error("nope");
      }),
    ).toBeNull();
  });
});

describe("checkRecordingSupport", () => {
  it("requires a secure context and the APIs", () => {
    expect(
      checkRecordingSupport({
        isSecureContext: false,
        hasGetUserMedia: true,
        hasMediaRecorder: true,
      }),
    ).toEqual({ ok: false, reason: "insecure-context" });
    expect(
      checkRecordingSupport({
        isSecureContext: true,
        hasGetUserMedia: false,
        hasMediaRecorder: true,
      }),
    ).toEqual({ ok: false, reason: "unsupported" });
    expect(
      checkRecordingSupport({
        isSecureContext: true,
        hasGetUserMedia: true,
        hasMediaRecorder: false,
      }),
    ).toEqual({ ok: false, reason: "unsupported" });
    expect(
      checkRecordingSupport({
        isSecureContext: true,
        hasGetUserMedia: true,
        hasMediaRecorder: true,
      }),
    ).toEqual({ ok: true });
  });
});
