// Shared by server code and middleware (edge-safe: no Node APIs here).

const isProduction = process.env.NODE_ENV === "production";

/**
 * `__Host-` prefix (production only, since it requires HTTPS) pins the cookie to
 * this exact host with Path=/ and Secure, preventing subdomain cookie injection.
 */
export const SESSION_COOKIE = isProduction ? "__Host-cc_session" : "cc_session";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Sessions are extended (sliding expiry) once less than this remains. */
export const SESSION_RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
