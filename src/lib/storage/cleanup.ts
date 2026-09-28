import "server-only";

import { rm } from "node:fs/promises";
import path from "node:path";

import { logger } from "@/lib/logger";

/**
 * Removes every stored recording for a user (called after account deletion,
 * once the database rows have cascaded away).
 */
export async function deleteUserStorage(userId: string) {
  const kind = process.env.STORAGE_DRIVER || "local";
  if (kind !== "local") return; // remote drivers delete per-object during cascade
  if (!/^[a-z0-9]+$/i.test(userId)) return;
  const root = path.resolve(process.env.STORAGE_LOCAL_DIR || ".data/storage");
  const dir = path.join(root, "recordings", userId);
  if (!dir.startsWith(root + path.sep)) return;
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    logger.error("storage.user_cleanup_failed", { error });
  }
}
