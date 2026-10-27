import { NextResponse } from "next/server";

import { MAX_FUNCTION_UPLOAD_BYTES } from "@/features/recording/constraints";
import { parseId, withUser } from "@/lib/api";
import { db } from "@/lib/db/client";
import { notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";

/**
 * Largest slice sent per response. Vercel caps function responses at ~4.5 MB,
 * so media is always served as 206 partial responses the player stitches together.
 */
const MAX_CHUNK_BYTES = MAX_FUNCTION_UPLOAD_BYTES;

/**
 * Streams a recording to its owner only. Supports HTTP Range requests so the
 * browser's media player can seek. Never cached by shared caches.
 */
export const GET = withUser<{ sessionId: string }>(async (req, { user, params }) => {
  const sessionId = parseId(params.sessionId, "Recording");
  const recording = await db.recording.findFirst({
    where: { sessionId, userId: user.id },
    select: { storageKey: true, mimeType: true },
  });
  if (!recording) throw notFound("Recording");

  const storage = getStorage();
  const info = await storage.stat(recording.storageKey);
  if (!info) throw notFound("Recording");
  const size = info.size;

  const headers = new Headers({
    "Content-Type": recording.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });

  const rangeHeader = req.headers.get("range");
  const range = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
  if (rangeHeader && !range) {
    headers.set("Content-Range", `bytes */${size}`);
    return new NextResponse(null, { status: 416, headers });
  }

  let start = 0;
  let end = size - 1;
  if (range) {
    if (range[1]) {
      start = Number(range[1]);
      if (range[2]) end = Number(range[2]);
    } else if (range[2]) {
      // suffix range: last N bytes
      start = Math.max(0, size - Number(range[2]));
    } else {
      headers.set("Content-Range", `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers });
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers });
    }
  }

  // Small files without a Range header go out whole; everything else is chunked.
  if (!range && size <= MAX_CHUNK_BYTES) {
    headers.set("Content-Length", String(size));
    const body = size === 0 ? null : await storage.openRead(recording.storageKey);
    return new NextResponse(body, { status: 200, headers });
  }

  end = Math.min(end, start + MAX_CHUNK_BYTES - 1);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  const body = await storage.openRead(recording.storageKey, { start, end });
  return new NextResponse(body, { status: 206, headers });
});
