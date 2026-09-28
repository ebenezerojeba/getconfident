import "server-only";

import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. On Vercel, x-real-ip and
 * x-forwarded-for are set by the edge network (client-supplied values are
 * overwritten). When self-hosting, run behind a proxy that does the same.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return real || forwarded || "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
