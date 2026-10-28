import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { authorizeRecordingUpload } from "@/features/practice/service";
import { parseId, withUser } from "@/lib/api";
import { AppError, isAppError } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Issues short-lived Vercel Blob tokens so the browser can upload recordings
 * straight to storage (function request bodies are capped at ~4.5 MB). Each
 * token is locked to one pathname inside the user's own session folder, with
 * type and size limits. The upload is attached afterwards via
 * POST /api/sessions/[id]/recording, which re-checks the stored file.
 */
export const POST = withUser<{ id: string }>(
  async (req, { user, params }) => {
    const sessionId = parseId(params.id, "Session");
    if (process.env.STORAGE_DRIVER !== "blob") {
      throw new AppError("NOT_FOUND", "Direct uploads are not enabled.");
    }
    // Browser upload tokens are signed with the store's read-write token. A
    // store connected only through Vercel OIDC (BLOB_STORE_ID) can't issue them.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new AppError("EXTERNAL_SERVICE", "Direct uploads are not available right now.", {
        cause: new Error(
          "BLOB_READ_WRITE_TOKEN is not set. Copy it from the Blob store's page in Vercel " +
            "into the project's environment variables, then redeploy.",
        ),
      });
    }

    let body: HandleUploadBody;
    try {
      body = (await req.json()) as HandleUploadBody;
    } catch {
      throw new AppError("VALIDATION", "Request body must be valid JSON.");
    }
    // No completion webhook is used; only token requests are accepted here.
    if (body?.type !== "blob.generate-client-token") {
      throw new AppError("VALIDATION", "Unsupported upload request.");
    }

    try {
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const limits = await authorizeRecordingUpload(user.id, sessionId, pathname);
          return {
            ...limits,
            addRandomSuffix: false,
            allowOverwrite: false,
            validUntil: Date.now() + 15 * 60_000,
          };
        },
      });
      return NextResponse.json(result);
    } catch (error) {
      if (isAppError(error)) throw error;
      // Logged with the SDK's message so the cause shows up in Vercel logs.
      throw new AppError("EXTERNAL_SERVICE", "Couldn't start the upload. Please try again.", {
        cause: error,
      });
    }
  },
  { rateLimit: { name: "upload-token", rule: RATE_LIMITS.uploadToken } },
);
