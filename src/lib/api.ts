import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/current-user";
import type { SafeUser } from "@/lib/auth/session";
import { AppError, isAppError, unauthorized } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit, type RateLimitRule } from "@/lib/rate-limit";

export type ApiErrorBody = {
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
};

export function errorResponse(error: unknown, event = "api.error"): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    if (error.status >= 500) logger.error(event, { code: error.code, error: error.cause ?? error });
    const res = NextResponse.json<ApiErrorBody>(
      { error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } },
      { status: error.status },
    );
    if (error.retryAfterSec) res.headers.set("Retry-After", String(error.retryAfterSec));
    return res;
  }
  logger.error(event, { error });
  return NextResponse.json<ApiErrorBody>(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

type Ctx<P> = { params: Promise<P> };

function serializeSessionCookie(token: string, expiresAt: Date): string {
  const o = sessionCookieOptions(expiresAt);
  return [
    `${SESSION_COOKIE}=${token}`,
    `Path=${o.path}`,
    `Expires=${o.expires.toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax",
    o.secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/**
 * Wraps an authenticated route handler: resolves the user from the session
 * cookie (never from the request body), applies an optional per-user rate
 * limit and converts errors into safe JSON responses.
 */
export function withUser<P = Record<string, string>>(
  handler: (req: Request, ctx: { user: SafeUser; params: P }) => Promise<Response>,
  options: { rateLimit?: { name: string; rule: RateLimitRule } } = {},
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      const session = await getCurrentSession();
      if (!session) throw unauthorized();
      if (options.rateLimit) {
        await enforceRateLimit(
          `${options.rateLimit.name}:${session.user.id}`,
          options.rateLimit.rule,
        );
      }
      const response = await handler(req, { user: session.user, params: await ctx.params });
      if (session.renewed) {
        // Sliding expiry: keep the cookie lifetime in step with the database.
        const token = (await cookies()).get(SESSION_COOKIE)?.value;
        if (token) {
          const cookie = serializeSessionCookie(token, session.expiresAt);
          response.headers.append("Set-Cookie", cookie);
        }
      }
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Route ids are validated; malformed ids look exactly like missing resources. */
export function parseId(value: unknown, what = "Resource"): string {
  if (typeof value === "string" && /^[a-z0-9]{1,64}$/i.test(value)) return value;
  throw new AppError("NOT_FOUND", `${what} not found.`);
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("VALIDATION", "Request body must be valid JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      (fieldErrors[issue.path.join(".") || "_"] ??= []).push(issue.message);
    }
    throw new AppError("VALIDATION", result.error.issues[0]?.message ?? "Invalid request.", {
      fieldErrors,
    });
  }
  return result.data;
}
