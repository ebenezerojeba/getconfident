import "server-only";

import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";

import { SESSION_RENEW_THRESHOLD_MS, SESSION_TTL_MS } from "./cookies";
import { generateSessionToken, hashSessionToken } from "./tokens";

export type SafeUser = Pick<User, "id" | "email" | "name" | "goal" | "timezone" | "onboardedAt">;

export type ValidatedSession = {
  sessionId: string;
  expiresAt: Date;
  /** True when expiry was extended and the cookie should be re-issued. */
  renewed: boolean;
  user: SafeUser;
};

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  goal: true,
  timezone: true,
  onboardedAt: true,
} as const;

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.authSession.create({
    data: {
      id: hashSessionToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
      ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
    },
  });
  return { token, expiresAt };
}

/**
 * Resolves a raw cookie token to a session + user. Expired sessions are deleted.
 * Sessions nearing expiry are extended (sliding window).
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  if (!token || token.length > 128) return null;
  const sessionId = hashSessionToken(token);
  const session = await db.authSession.findUnique({
    where: { id: sessionId },
    include: { user: { select: safeUserSelect } },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.authSession.deleteMany({ where: { id: sessionId } });
    return null;
  }

  let expiresAt = session.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - now < SESSION_RENEW_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_TTL_MS);
    renewed = true;
    await db.authSession.update({
      where: { id: sessionId },
      data: { expiresAt, lastSeenAt: new Date(now) },
    });
  }

  return { sessionId, expiresAt, renewed, user: session.user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.authSession.deleteMany({ where: { id: sessionId } });
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await invalidateSession(hashSessionToken(token));
}

/** Signs the user out everywhere, optionally keeping the current session. */
export async function invalidateUserSessions(userId: string, exceptSessionId?: string) {
  await db.authSession.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

export async function deleteExpiredSessions(): Promise<number> {
  const { count } = await db.authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return count;
}
