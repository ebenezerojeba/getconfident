"use client";

import { ApiError, apiFetch } from "@/lib/api-client";

import { baseMimeType, MAX_UPLOAD_CHUNKS, UPLOAD_CHUNK_BYTES } from "./constraints";

export type ChunkedUpload = { uploadId: string; parts: number; mimeType: string };

const RETRIES = 3;

/**
 * Uploads a large recording through the server in pieces small enough for
 * Vercel's request limit. Each piece is retried on network/server errors.
 * The server joins the pieces when the recording is submitted.
 */
export async function uploadInChunks(
  file: Blob,
  opts: { sessionId: string; role: "media" | "audio"; onProgress: (loadedBytes: number) => void },
): Promise<ChunkedUpload> {
  const parts = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  if (parts > MAX_UPLOAD_CHUNKS) {
    throw new ApiError("This recording is too large to upload. Try a shorter take.", 0, "UPLOAD");
  }
  const uploadId = crypto.randomUUID();
  const base = `/api/sessions/${opts.sessionId}/recording-chunk?uploadId=${uploadId}&role=${opts.role}`;

  for (let index = 0; index < parts; index++) {
    const start = index * UPLOAD_CHUNK_BYTES;
    const end = Math.min(file.size, start + UPLOAD_CHUNK_BYTES);
    const body = file.slice(start, end);
    for (let attempt = 1; ; attempt++) {
      try {
        await apiFetch(`${base}&index=${index}`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body,
        });
        break;
      } catch (error) {
        const retryable = error instanceof ApiError && (error.status === 0 || error.status >= 500);
        if (!retryable || attempt >= RETRIES) throw error;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    opts.onProgress(end);
  }
  return { uploadId, parts, mimeType: baseMimeType(file.type) };
}
