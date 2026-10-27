import "server-only";

import { db } from "@/lib/db/client";
import { rateLimited } from "@/lib/errors";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSec: number;
};

export type RateLimitRule = {
  /** Maximum requests allowed within the window. */
  limit: number;
  windowMs: number;
};

/** Named rules so limits are tuned in one place. */
export const RATE_LIMITS = {
  signInIp: { limit: 20, windowMs: 15 * 60_000 },
  signInEmail: { limit: 8, windowMs: 15 * 60_000 },
  signUpIp: { limit: 5, windowMs: 60 * 60_000 },
  passwordChange: { limit: 5, windowMs: 15 * 60_000 },
  aiAnalysis: { limit: 30, windowMs: 60 * 60_000 },
  followUp: { limit: 60, windowMs: 60 * 60_000 },
  upload: { limit: 30, windowMs: 60 * 60_000 },
  uploadToken: { limit: 60, windowMs: 60 * 60_000 },
  topics: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fixed-window counter stored in PostgreSQL. A single atomic upsert both
 * increments and resets expired windows, so it is safe across concurrent
 * serverless instances. (An Upstash Redis backend can replace this without
 * changing callers.)
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  // Prisma stores DateTime as `timestamp` (no zone) holding UTC wall time, so we
  // pass explicit UTC timestamps instead of NOW(), which depends on the server's
  // TimeZone setting.
  const now = new Date();
  const nowUtc = now.toISOString();
  const resetUtc = new Date(now.getTime() + rule.windowMs).toISOString();
  const rows = await db.$queryRaw<{ count: number; resetAt: string }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetUtc}::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${nowUtc}::timestamp THEN 1
                     ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${nowUtc}::timestamp THEN EXCLUDED."resetAt"
                       ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", to_char("resetAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "resetAt"`;
  const count = Number(rows[0].count);
  const resetAt = new Date(rows[0].resetAt);
  const retryAfterSec = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  return {
    success: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    retryAfterSec,
  };
}

/** Throws a RATE_LIMIT AppError when the limit is exceeded. */
export async function enforceRateLimit(key: string, rule: RateLimitRule): Promise<void> {
  const result = await consumeRateLimit(key, rule);
  if (!result.success) throw rateLimited(result.retryAfterSec);
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimitBucket.deleteMany({ where: { key } });
}
