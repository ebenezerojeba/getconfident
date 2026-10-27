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
  /** Size of a stored object, or null when it doesn't exist. */
  stat(key: string): Promise<{ size: number } | null>;
  /**
   * Streams an object, or an inclusive byte range of it. Used to serve media
   * without loading whole files into memory (or into one oversized response).
   */
  openRead(key: string, range?: ByteRange): Promise<ReadableStream<Uint8Array>>;
  /** Removes every object under a folder-like prefix, e.g. "recordings/<userId>/". */
  deletePrefix(prefix: string): Promise<void>;
}

/** Inclusive byte range, as in HTTP Range headers. */
export type ByteRange = { start: number; end: number };

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]{0,200}\.[a-z0-9]{2,5}$/i;
const PREFIX_PATTERN = /^[a-z0-9][a-z0-9/_-]{0,200}\/$/i;

export function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//")) {
    throw new AppError("VALIDATION", "Invalid storage key.");
  }
}

export function assertSafePrefix(prefix: string) {
  if (!PREFIX_PATTERN.test(prefix) || prefix.includes("..") || prefix.includes("//")) {
    throw new AppError("VALIDATION", "Invalid storage prefix.");
  }
}
