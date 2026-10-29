import { NextResponse } from "next/server";

import { storeRecordingChunk } from "@/features/practice/service";
import { UPLOAD_CHUNK_BYTES } from "@/features/recording/constraints";
import { parseId, withUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Receives one piece of a large recording (each piece stays under Vercel's
 * ~4.5 MB request limit). Query: ?uploadId=<uuid>&role=media|audio&index=<n>.
 * The pieces are joined when the recording is submitted.
 */
export const POST = withUser<{ id: string }>(
  async (req, { user, params }) => {
    const sessionId = parseId(params.id, "Session");
    const url = new URL(req.url);
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > UPLOAD_CHUNK_BYTES) {
      throw new AppError("UPLOAD", "Upload part is too large.");
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await req.arrayBuffer());
    } catch {
      throw new AppError("UPLOAD", "The upload was incomplete. Please try again.");
    }
    await storeRecordingChunk(user.id, sessionId, {
      uploadId: url.searchParams.get("uploadId") ?? "",
      role: url.searchParams.get("role") ?? "",
      index: Number(url.searchParams.get("index") ?? NaN),
      bytes,
    });
    return new NextResponse(null, { status: 204 });
  },
  { rateLimit: { name: "upload-chunk", rule: RATE_LIMITS.uploadChunk } },
);
