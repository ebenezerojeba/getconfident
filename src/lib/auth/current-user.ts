import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { forbidden, notFound } from "@/lib/errors";

import { SESSION_COOKIE } from "./cookies";
import { type SafeUser, type ValidatedSession, validateSessionToken } from "./session";

/**
 * Resolves the authenticated session for this request. Memoised per request so
 * layouts, pages and actions can all call it cheaply. The user id is always
 * derived from the server-side session — never from client input.
 */
export const getCurrentSession = cache(async (): Promise<ValidatedSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

export async function getCurrentUser(): Promise<SafeUser | null> {
  return (await getCurrentSession())?.user ?? null;
}

/** For pages/layouts: redirect to sign-in (or onboarding) when needed. */
export async function requireUser(
  options: { allowUnonboarded?: boolean; returnTo?: string } = {},
): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    const returnTo = options.returnTo ?? (await headers()).get("x-pathname");
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/sign-in${next}`);
  }
  if (!user.onboardedAt && !options.allowUnonboarded) redirect("/onboarding");
  return user;
}

/**
 * Ownership guard for user-owned resources. Returns 404 (not 403) when the
 * resource belongs to someone else so its existence isn't revealed.
 */
export function assertOwnership<T extends { userId: string }>(
  resource: T | null | undefined,
  userId: string,
  what = "Resource",
): T {
  if (!resource || resource.userId !== userId) throw notFound(what);
  return resource;
}

export { forbidden };
