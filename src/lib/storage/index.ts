import "server-only";

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/lib/errors";

/**
 * Object storage abstraction for recordings. Keys are opaque, server-generated
 * and never exposed as public URLs; media is streamed through an authorized
 * route handler (/api/recordings/[id]).
 */
export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array<ArrayBuffer>>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]{0,200}\.[a-z0-9]{2,5}$/i;

export function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//")) {
    throw new AppError("VALIDATION", "Invalid storage key.");
  }
}

/** Local filesystem driver for development/tests (not for serverless production). */
export function createLocalDriver(root: string): StorageDriver {
  const base = path.resolve(root);
  const resolve = (key: string) => {
    assertSafeKey(key);
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
  throw new AppError("EXTERNAL_SERVICE", "Recording storage is not configured.", {
    cause: new Error(`Unknown STORAGE_DRIVER: ${kind}`),
  });
}

/** Test hook. */
export function setStorageDriver(d: StorageDriver | null) {
  driver = d;
}
