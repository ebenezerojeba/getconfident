/** Shared (client + server) upload constraints for recordings. */

export const MAX_RECORDING_BYTES = {
  VIDEO: 150 * 1024 * 1024,
  AUDIO: 25 * 1024 * 1024, // OpenAI transcription limit is 25 MB
} as const;

/** Audio sent to transcription must stay under the provider limit. */
export const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;

export const MAX_RECORDING_SECONDS = 10 * 60 + 30; // 10-minute timer + grace

export const ALLOWED_MIME_TYPES = {
  VIDEO: ["video/webm", "video/mp4"],
  AUDIO: ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"],
} as const;

export type RecordingKindName = keyof typeof ALLOWED_MIME_TYPES;

/** Strips codec parameters: "video/webm;codecs=vp8,opus" → "video/webm". */
export function baseMimeType(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

export function isAllowedMimeType(kind: RecordingKindName, mime: string): boolean {
  return (ALLOWED_MIME_TYPES[kind] as readonly string[]).includes(baseMimeType(mime));
}

export const FILE_EXTENSION: Record<string, string> = {
  "video/webm": "webm",
  "video/mp4": "mp4",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/**
 * Checks the container's magic bytes so a renamed file can't masquerade as
 * media. Returns the detected container family or null.
 */
export function sniffContainer(bytes: Uint8Array): "webm" | "mp4" | "ogg" | "mp3" | "wav" | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "mp4"; // ftyp
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return "ogg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return "wav";
  if (
    (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) ||
    (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)
  ) {
    return "mp3";
  }
  return null;
}

export function containerMatchesMime(container: ReturnType<typeof sniffContainer>, mime: string) {
  const ext = FILE_EXTENSION[baseMimeType(mime)];
  if (!container || !ext) return false;
  if (container === "mp4") return ext === "mp4" || ext === "m4a";
  return container === ext;
}
