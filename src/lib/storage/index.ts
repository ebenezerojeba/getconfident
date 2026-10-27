import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { AppError } from "@/lib/errors";

import { assertSafeKey, assertSafePrefix, type StorageDriver } from "./keys";
import { createBlobDriver } from "./blob";

export { assertSafeKey, assertSafePrefix, type ByteRange, type StorageDriver } from "./keys";

/** Local filesystem driver for development/tests (not for serverless production). */
export function createLocalDriver(root: string): StorageDriver {
  const base = path.resolve(root);
  const resolve = (key: string, check = assertSafeKey) => {
    check(key);
    const full = path.resolve(base, key);
    if (!full.startsWith(base + path.sep)) throw new AppError("VALIDATION", "Invalid storage key.");
    return full;
  };
  return {
    name: "local",
    async put(key, data) {
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(resolve(key)));
      } catch (cause) {
        throw new AppError("NOT_FOUND", "Recording file not found.", { cause });
      }
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
    async exists(key) {
      try {
        await stat(resolve(key));
        return true;
      } catch {
        return false;
      }
    },
    async deletePrefix(prefix) {
      await rm(resolve(prefix, assertSafePrefix), { recursive: true, force: true });
    },
    async stat(key) {
      try {
        const info = await stat(resolve(key));
        return info.isFile() ? { size: info.size } : null;
      } catch {
        return null;
      }
    },
    async openRead(key, range) {
      const full = resolve(key);
      try {
        await stat(full);
      } catch (cause) {
        throw new AppError("NOT_FOUND", "Recording file not found.", { cause });
      }
      const stream = createReadStream(full, range ? { start: range.start, end: range.end } : {});
      return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    },
  };
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER || "local";
  if (kind === "local") {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      throw new AppError("EXTERNAL_SERVICE", "Recording storage is not configured.", {
        cause: new Error("STORAGE_DRIVER=local cannot be used on Vercel (ephemeral filesystem)"),
      });
    }
    driver = createLocalDriver(process.env.STORAGE_LOCAL_DIR || ".data/storage");
    return driver;
  }
  if (kind === "blob") {
    driver = createBlobDriver();
    return driver;
  }
  throw new AppError("EXTERNAL_SERVICE", "Recording storage is not configured.", {
    cause: new Error(`Unknown STORAGE_DRIVER: ${kind}`),
  });
}

/** Test hook. */
export function setStorageDriver(d: StorageDriver | null) {
  driver = d;
}
