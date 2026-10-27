import { after, NextResponse } from "next/server";

import {
  attachStoredRecording,
  deleteSessionRecording,
  processSession,
  saveRecording,
} from "@/features/practice/service";
import { MAX_RECORDING_BYTES, MAX_TRANSCRIPTION_BYTES } from "@/features/recording/constraints";
import { parseId, parseJson, withUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { storedRecordingSchema, uploadMetaSchema } from "@/lib/validation/practice";

// Allow long-running processing after the response (Vercel function limit).
export const maxDuration = 300;

const MAX_REQUEST_BYTES = MAX_RECORDING_BYTES.VIDEO + MAX_TRANSCRIPTION_BYTES + 1024 * 1024;

async function fileToUpload(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") return null;
  return { bytes: new Uint8Array(await value.arrayBuffer()), mimeType: value.type || "" };
}

/** Server-side upload (multipart form). Used with the local storage driver. */
async function saveFromForm(req: Request, userId: string, sessionId: string) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_REQUEST_BYTES) {
    throw new AppError("UPLOAD", "The recording is too large to upload.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("UPLOAD", "The upload was incomplete. Please try again.");
  }
  const meta = uploadMetaSchema.safeParse({
    kind: form.get("kind"),
    durationMs: form.get("durationMs") ?? 0,
    elapsedSec: form.get("elapsedSec") ?? 0,
  });
  if (!meta.success) throw new AppError("VALIDATION", "Invalid recording details.");

  const media = await fileToUpload(form.get("media"));
  if (!media) throw new AppError("UPLOAD", "No recording was attached.");
  const audio = await fileToUpload(form.get("audio"));

  await saveRecording(userId, sessionId, { ...meta.data, media, audio });
}

export const POST = withUser<{ id: string }>(
  async (req, { user, params }) => {
    const sessionId = parseId(params.id, "Session");
    if (req.headers.get("content-type")?.startsWith("application/json")) {
      // Files were uploaded straight to storage; attach them to the session.
      const input = await parseJson(req, storedRecordingSchema);
      await attachStoredRecording(user.id, sessionId, input);
    } else {
      await saveFromForm(req, user.id, sessionId);
    }

    after(async () => {
      try {
        await processSession(sessionId);
      } catch (error) {
        logger.error("session.processing_crashed", { sessionId, error });
      }
    });

    return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
  },
  { rateLimit: { name: "upload", rule: RATE_LIMITS.upload } },
);

export const DELETE = withUser<{ id: string }>(async (_req, { user, params }) => {
  await deleteSessionRecording(user.id, parseId(params.id, "Session"));
  return new NextResponse(null, { status: 204 });
});
