"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

/** Marks all of the current user's notifications as read. */
export async function markNotificationsReadAction(): Promise<{ updated: number }> {
  const user = await getCurrentUser();
  if (!user) return { updated: 0 };
  const { count } = await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: count };
}
