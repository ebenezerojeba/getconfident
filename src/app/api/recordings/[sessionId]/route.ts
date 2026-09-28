import { NextResponse } from "next/server";

import { parseId, withUser } from "@/lib/api";
import { db } from "@/lib/db/client";
import { notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";

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

  const bytes = await getStorage().get(recording.storageKey);
  const size = bytes.byteLength;
  const headers = new Headers({
    "Content-Type": recording.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    let start = range[1] ? Number(range[1]) : NaN;
    let end = range[2] ? Number(range[2]) : size - 1;
    if (Number.isNaN(start)) {
      // suffix range: last N bytes
      start = Math.max(0, size - end);
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new NextResponse(bytes.slice(start, end + 1), { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new NextResponse(bytes, { status: 200, headers });
});
