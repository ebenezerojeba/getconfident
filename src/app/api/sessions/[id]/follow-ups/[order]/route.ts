import { NextResponse } from "next/server";

import { answerFollowUp } from "@/features/follow-up/service";
import { MAX_TRANSCRIPTION_BYTES } from "@/features/recording/constraints";
import { validateMediaFile } from "@/features/practice/service";
import { getTranscriptionService } from "@/features/transcription/service";
import { parseId, withUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 180;

/** Answers a follow-up question with an audio recording (transcribed, then evaluated). */
export const POST = withUser<{ id: string; order: string }>(
  async (req, { user, params }) => {
    const sessionId = parseId(params.id, "Session");
    const order = Number(params.order);
    if (!Number.isInteger(order) || order < 1 || order > 10) {
      throw new AppError("NOT_FOUND", "Question not found.");
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("UPLOAD", "The upload was incomplete. Please try again.");
    }
    const file = form.get("audio");
    if (!file || typeof file === "string") throw new AppError("UPLOAD", "No answer was attached.");
    const audio = { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type || "" };
    validateMediaFile("AUDIO", audio, MAX_TRANSCRIPTION_BYTES);

    const transcript = await getTranscriptionService().transcribe({
      audio: audio.bytes,
      mimeType: audio.mimeType,
    });
    const answered = await answerFollowUp(user.id, sessionId, order, transcript.text);

    return NextResponse.json({
      answer: {
        order: answered.order,
        answerText: answered.answerText,
        score: answered.score,
        evaluation: answered.evaluation,
      },
    });
  },
  { rateLimit: { name: "follow-up-answer", rule: RATE_LIMITS.followUp } },
);
