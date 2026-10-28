"use client";

import { upload } from "@vercel/blob/client";

import { ApiError } from "@/lib/api-client";

import { baseMimeType, FILE_EXTENSION } from "./constraints";

/** Above this size the SDK splits the upload into parallel, retried parts. */
const MULTIPART_THRESHOLD = 8 * 1024 * 1024;

export type StoredUpload = { key: string; mimeType: string };

/**
 * Uploads a recording straight from the browser to private Vercel Blob storage,
 * skipping the ~4.5 MB function body limit. The server issues a token locked
 * to this exact pathname inside the user's session folder.
 */
export async function uploadToStorage(
  file: Blob,
  opts: {
    sessionId: string;
    prefix: string;
    role: "media" | "audio";
    onProgress: (loadedBytes: number) => void;
  },
): Promise<StoredUpload> {
  const mimeType = baseMimeType(file.type);
  const ext = FILE_EXTENSION[mimeType];
  if (!ext) throw new ApiError("Unsupported recording format.", 0, "UPLOAD");
  const key = `${opts.prefix}${crypto.randomUUID()}-${opts.role}.${ext}`;
  try {
    await upload(key, file, {
      access: "private",
      contentType: mimeType,
      handleUploadUrl: `/api/sessions/${opts.sessionId}/upload-token`,
      multipart: file.size > MULTIPART_THRESHOLD,
      onUploadProgress: ({ loaded }) => opts.onProgress(loaded),
    });
  } catch (error) {
    // Keep the real cause visible in the browser console for debugging.
    console.error("[upload] direct upload to storage failed", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError("We couldn't upload your recording. Please try again.", 0, "DIRECT_UPLOAD");
  }
  return { key, mimeType };
}
