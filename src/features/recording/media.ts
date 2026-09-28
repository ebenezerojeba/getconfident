/** Pure, browser-agnostic helpers for media capture (unit-testable). */

export type MediaErrorKind =
  | "permission-denied"
  | "no-device"
  | "device-busy"
  | "insecure-context"
  | "unsupported"
  | "unknown";

export const MEDIA_ERROR_MESSAGES: Record<MediaErrorKind, { title: string; description: string }> =
  {
    "permission-denied": {
      title: "Permission needed",
      description:
        "Your browser blocked access. Click the camera/microphone icon in the address bar, allow access, then try again.",
    },
    "no-device": {
      title: "No device found",
      description: "We couldn't find a microphone or camera. Connect one and try again.",
    },
    "device-busy": {
      title: "Device in use",
      description: "Another app or tab is using your camera or microphone. Close it and try again.",
    },
    "insecure-context": {
      title: "Secure connection required",
      description: "Recording only works over HTTPS. Open the app from its secure address.",
    },
    unsupported: {
      title: "Browser not supported",
      description:
        "Your browser can't record media. Use a recent version of Chrome, Edge, Firefox or Safari.",
    },
    unknown: {
      title: "Couldn't start recording",
      description: "Something went wrong while accessing your devices. Please try again.",
    },
  };

export function classifyMediaError(error: unknown): MediaErrorKind {
  const name = (error as { name?: string } | null)?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "permission-denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "no-device";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "device-busy";
    default:
      return "unknown";
  }
}

export const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

export const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

/** First candidate the browser can record, or null. */
export function pickMimeType(
  kind: "video" | "audio",
  isTypeSupported: (type: string) => boolean,
): string | null {
  const list = kind === "video" ? VIDEO_MIME_CANDIDATES : AUDIO_MIME_CANDIDATES;
  return (
    list.find((t) => {
      try {
        return isTypeSupported(t);
      } catch {
        return false;
      }
    }) ?? null
  );
}

export type SupportCheck = { ok: true } | { ok: false; reason: MediaErrorKind };

export function checkRecordingSupport(env: {
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
}): SupportCheck {
  if (!env.isSecureContext) return { ok: false, reason: "insecure-context" };
  if (!env.hasGetUserMedia || !env.hasMediaRecorder) return { ok: false, reason: "unsupported" };
  return { ok: true };
}
