import { after, NextResponse } from "next/server";

import { processSession, saveRecording, deleteSessionRecording } from "@/features/practice/service";
import { MAX_RECORDING_BYTES, MAX_TRANSCRIPTION_BYTES } from "@/features/recording/constraints";
import { parseId, withUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { uploadMetaSchema } from "@/lib/validation/practice";

// Allow long-running processing after the response (Vercel function limit).
export const maxDuration = 300;

const MAX_REQUEST_BYTES = MAX_RECORDING_BYTES.VIDEO + MAX_TRANSCRIPTION_BYTES + 1024 * 1024;

async function fileToUpload(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") return null;
  return { bytes: new Uint8Array(await value.arrayBuffer()), mimeType: value.type || "" };
}

export const POST = withUser<{ id: string }>(
  async (req, { user, params }) => {
    const sessionId = parseId(params.id, "Session");
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

    await saveRecording(user.id, sessionId, { ...meta.data, media, audio });

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
