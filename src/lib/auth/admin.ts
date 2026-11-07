import "server-only";

import { notFound } from "next/navigation";

import { isAdminEmail } from "./admin-emails";
import { requireUser } from "./current-user";
import type { SafeUser } from "./session";

/**
 * Admin pages: signed-in users whose email is listed in ADMIN_EMAILS.
 * Everyone else gets a 404, so the admin area's existence isn't revealed.
 */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return user;
}

export { isAdminEmail };
