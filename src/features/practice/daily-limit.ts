import "server-only";

import { AppError } from "@/lib/errors";
import { consumeRateLimit, peekRateLimit, type RateLimitRule } from "@/lib/rate-limit";

const DEFAULT_DAILY_SESSIONS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Practice sessions a user can submit per 24 hours (each one costs an AI
 * transcription and analysis). Set DAILY_SESSION_LIMIT to change it.
 */
export function dailySessionRule(): RateLimitRule {
  const configured = Number(process.env.DAILY_SESSION_LIMIT);
  const limit =
    Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DAILY_SESSIONS;
  return { limit, windowMs: DAY_MS };
}

const key = (userId: string) => `practice:daily:${userId}`;

function limitReached(limit: number, resetAt: Date | null) {
  const hours = resetAt ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 3_600_000)) : 24;
  return new AppError(
    "RATE_LIMIT",
    `You've used all ${limit} practice sessions for today. You can practise again in about ${hours} hour${hours === 1 ? "" : "s"}.`,
    { retryAfterSec: hours * 3600 },
  );
}

/** How many sessions the user can still submit today. */
export async function dailySessionsRemaining(userId: string) {
  const rule = dailySessionRule();
  const usage = await peekRateLimit(key(userId), rule);
  return { limit: rule.limit, remaining: usage.remaining, resetAt: usage.resetAt };
}

/** Checked before starting a session, so nobody records a take they can't submit. */
export async function assertDailySessionsLeft(userId: string) {
  const { limit, remaining, resetAt } = await dailySessionsRemaining(userId);
  if (remaining <= 0) throw limitReached(limit, resetAt);
}

/** Counts a submitted recording against today's allowance. */
export async function consumeDailySession(userId: string) {
  const rule = dailySessionRule();
  const result = await consumeRateLimit(key(userId), rule);
  if (!result.success) throw limitReached(rule.limit, result.resetAt);
}
