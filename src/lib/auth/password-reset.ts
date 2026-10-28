import { createHmac, timingSafeEqual } from "node:crypto";

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return value;
}

function sign(userId: string, expiresAt: number, passwordHash: string): string {
  return createHmac("sha256", secret())
    .update(`password-reset:${userId}:${expiresAt}:${passwordHash}`)
    .digest("base64url");
}

/**
 * Password reset tokens are signed, not stored. The signature covers the
 * user's current password hash, so a token stops working as soon as the
 * password changes: each link works once, and older links die with it.
 */
export function createResetToken(
  user: { id: string; passwordHash: string },
  now = Date.now(),
): string {
  const expiresAt = now + RESET_TOKEN_TTL_MS;
  const payload = Buffer.from(`${user.id}.${expiresAt}`).toString("base64url");
  return `${payload}.${sign(user.id, expiresAt, user.passwordHash)}`;
}

/** Reads the user id and expiry from a token without trusting it. */
export function parseResetToken(token: string): { userId: string; expiresAt: number } | null {
  if (typeof token !== "string" || token.length > 300) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const [userId, expires, rest] = Buffer.from(payload, "base64url").toString("utf8").split(".");
  const expiresAt = Number(expires);
  if (!userId || !/^[a-z0-9]{1,64}$/i.test(userId) || rest !== undefined) return null;
  if (!Number.isSafeInteger(expiresAt)) return null;
  return { userId, expiresAt };
}

/** True when the token was issued for this user's current password and hasn't expired. */
export function verifyResetToken(
  token: string,
  user: { id: string; passwordHash: string },
  now = Date.now(),
): boolean {
  const parsed = parseResetToken(token);
  if (!parsed || parsed.userId !== user.id || parsed.expiresAt < now) return false;
  const expected = Buffer.from(sign(user.id, parsed.expiresAt, user.passwordHash));
  const given = Buffer.from(token.split(".")[1] ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
