import { createHmac, randomBytes } from "node:crypto";

/** 256-bit random session token, sent to the browser only inside an HttpOnly cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return secret;
}

/**
 * The database stores HMAC-SHA256(AUTH_SECRET, token) instead of the token, so
 * neither a database leak nor a leaked secret alone yields a usable session.
 */
export function hashSessionToken(token: string): string {
  return createHmac("sha256", authSecret()).update(token).digest("hex");
}
