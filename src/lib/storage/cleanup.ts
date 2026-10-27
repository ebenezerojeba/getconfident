import "server-only";

import { logger } from "@/lib/logger";

import { getStorage } from "./index";

/**
 * Removes every stored recording for a user (called after account deletion,
 * once the database rows have cascaded away — the cascade does not touch storage).
 */
export async function deleteUserStorage(userId: string) {
  if (!/^[a-z0-9]+$/i.test(userId)) return;
  try {
    await getStorage().deletePrefix(`recordings/${userId}/`);
  } catch (error) {
    logger.error("storage.user_cleanup_failed", { error });
  }
}
