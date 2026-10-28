import "server-only";

import { BlobNotFoundError, del, get, head, list, put } from "@vercel/blob";

import { AppError } from "@/lib/errors";

import { assertSafeKey, assertSafePrefix, type ByteRange, type StorageDriver } from "./keys";

export interface BlobApi {
  put: typeof put;
  get: typeof get;
  head: typeof head;
  del: typeof del;
  list: typeof list;
}

const defaultApi: BlobApi = { put, get, head, del, list };

/**
 * Vercel Blob storage (private store). Recordings are never given a public
 * URL; media is streamed through the authorized route. The SDK reads
 * BLOB_READ_WRITE_TOKEN, which Vercel adds when a Blob store is connected.
 */
export function createBlobDriver(api: BlobApi = defaultApi): StorageDriver {
  // Either a read-write token or a store connected through Vercel OIDC works
  // for server-side reads/writes (browser upload tokens need the read-write token).
  if (api === defaultApi && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    throw new AppError("EXTERNAL_SERVICE", "Recording storage is not configured.", {
      cause: new Error("STORAGE_DRIVER=blob requires BLOB_READ_WRITE_TOKEN (or BLOB_STORE_ID)"),
    });
  }

  return {
    name: "blob",
    async put(key, data, contentType) {
      assertSafeKey(key);
      await api.put(key, Buffer.from(data), {
        access: "private",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    },
    async get(key) {
      assertSafeKey(key);
      const res = await api.get(key, { access: "private" });
      if (!res || res.statusCode !== 200) {
        throw new AppError("NOT_FOUND", "Recording file not found.");
      }
      return new Uint8Array(await new Response(res.stream).arrayBuffer());
    },
    async delete(key) {
      assertSafeKey(key);
      await api.del(key);
    },
    async exists(key) {
      assertSafeKey(key);
      try {
        await api.head(key);
        return true;
      } catch (error) {
        if (error instanceof BlobNotFoundError) return false;
        throw error;
      }
    },
    async stat(key) {
      assertSafeKey(key);
      try {
        const info = await api.head(key);
        return { size: info.size };
      } catch (error) {
        if (error instanceof BlobNotFoundError) return null;
        throw error;
      }
    },
    async openRead(key, range) {
      assertSafeKey(key);
      const res = await api.get(key, {
        access: "private",
        ...(range ? { headers: { Range: `bytes=${range.start}-${range.end}` } } : {}),
      });
      if (!res || res.statusCode !== 200) {
        throw new AppError("NOT_FOUND", "Recording file not found.");
      }
      // If the store ignored the Range header, cut the range out ourselves.
      if (range && !res.headers.get("content-range")) return sliceStream(res.stream, range);
      return res.stream;
    },
    async deletePrefix(prefix) {
      assertSafePrefix(prefix);
      let cursor: string | undefined;
      do {
        const page = await api.list({ prefix, cursor });
        if (page.blobs.length > 0) await api.del(page.blobs.map((b) => b.pathname));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    },
  };
}

/** Passes through only bytes [start, end] (inclusive) of a stream. */
export function sliceStream(
  source: ReadableStream<Uint8Array>,
  { start, end }: ByteRange,
): ReadableStream<Uint8Array> {
  let offset = 0;
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        if (offset > end) {
          controller.close();
          await reader.cancel();
          return;
        }
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const chunkStart = offset;
        offset += value.byteLength;
        const from = Math.max(start - chunkStart, 0);
        const to = Math.min(end - chunkStart + 1, value.byteLength);
        if (from < to) {
          controller.enqueue(value.subarray(from, to));
          return;
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
