"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";

import { type ActionState, errorState, fieldErrorsFrom } from "@/lib/actions";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/current-user";
import {
  authenticate,
  changePassword,
  createPasswordResetLink,
  INVALID_CREDENTIALS_MESSAGE,
  registerUser,
  resetPasswordWithToken,
} from "@/lib/auth/service";
import { createSession, invalidateSessionToken } from "@/lib/auth/session";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db/client";
import { getEmailProvider, isEmailConfigured } from "@/lib/email/client";
import { passwordResetEmail } from "@/lib/email/templates";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { consumeRateLimit, enforceRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(userId, {
    userAgent: await getUserAgent(),
    ipAddress: await getClientIp(),
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { name: raw.name, email: raw.email };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  try {
    await enforceRateLimit(`auth:sign-up:ip:${await getClientIp()}`, RATE_LIMITS.signUpIp);
    const user = await registerUser(parsed.data);
    await startSession(user.id);
    logger.info("auth.sign_up", { userId: user.id });
  } catch (error) {
    return { ...errorState(error, "auth.sign_up_failed"), values };
  }
  redirect("/onboarding");
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { email: raw.email };
  const next = safeRedirectPath(formData.get("next"));

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  let onboarded = false;
  try {
    const ip = await getClientIp();
    const emailKey = `auth:sign-in:email:${parsed.data.email}`;
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit(`auth:sign-in:ip:${ip}`, RATE_LIMITS.signInIp),
      consumeRateLimit(emailKey, RATE_LIMITS.signInEmail),
    ]);
    if (!ipLimit.success || !emailLimit.success) {
      logger.warn("auth.sign_in_rate_limited", { ip });
      const wait = Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec);
      throw new AppError(
        "RATE_LIMIT",
        `Too many sign-in attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`,
      );
    }

    const userId = await authenticate(parsed.data.email, parsed.data.password);
    if (!userId) {
      return { status: "error", message: INVALID_CREDENTIALS_MESSAGE, values };
    }

    await resetRateLimit(emailKey);
    await startSession(userId);
    const user = await db.user.findUnique({ where: { id: userId }, select: { onboardedAt: true } });
    onboarded = Boolean(user?.onboardedAt);
    logger.info("auth.sign_in", { userId });
  } catch (error) {
    return { ...errorState(error, "auth.sign_in_failed"), values };
  }
  redirect(onboarded ? next : "/onboarding");
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await invalidateSessionToken(token);
    } catch (error) {
      logger.error("auth.sign_out_failed", { error });
    }
  }
  jar.delete(SESSION_COOKIE);
  redirect("/sign-in?signedOut=1");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    await enforceRateLimit(`auth:password:${session.user.id}`, RATE_LIMITS.passwordChange);
    await changePassword(
      session.user.id,
      session.sessionId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    return { status: "success", message: "Password updated. Other devices were signed out." };
  } catch (error) {
    return errorState(error, "auth.change_password_failed");
  }
}

/** Signs out every other device, keeping the current session. */
export async function signOutOtherSessionsAction(): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");
  const { count } = await db.authSession.deleteMany({
    where: { userId: session.user.id, id: { not: session.sessionId } },
  });
  return {
    status: "success",
    message: count ? `Signed out of ${count} other session(s).` : "No other active sessions.",
  };
}

const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. Check your inbox (and spam folder).";

/**
 * Emails a password reset link. Always answers the same way, whether or not
 * the account exists, and sends after responding so timing reveals nothing.
 */
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = { email: String(formData.get("email") ?? "") };
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: raw,
    };
  }
  const { email } = parsed.data;

  try {
    await enforceRateLimit(
      `auth:password-reset:ip:${await getClientIp()}`,
      RATE_LIMITS.passwordResetIp,
    );
    const perEmail = await consumeRateLimit(
      `auth:password-reset:email:${email}`,
      RATE_LIMITS.passwordResetEmail,
    );
    if (perEmail.success) {
      after(async () => {
        try {
          const link = await createPasswordResetLink(email, siteConfig.url);
          if (!link) return;
          if (!isEmailConfigured()) {
            if (process.env.NODE_ENV === "production") {
              logger.error("auth.password_reset_email_not_configured", {});
              return;
            }
            // Development only: there is no inbox, so print the link.
            logger.info("auth.password_reset_link_dev", { url: link.url });
            return;
          }
          await getEmailProvider().send(
            passwordResetEmail({ to: link.user.email, name: link.user.name, resetUrl: link.url }),
          );
          logger.info("auth.password_reset_requested", {});
        } catch (error) {
          logger.error("auth.password_reset_email_failed", { error });
        }
      });
    }
  } catch (error) {
    return { ...errorState(error, "auth.password_reset_request_failed"), values: raw };
  }
  return { status: "success", message: RESET_REQUESTED_MESSAGE };
}

/** Sets a new password from a reset link, then sends the user to sign in. */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    await enforceRateLimit(
      `auth:password-reset:ip:${await getClientIp()}`,
      RATE_LIMITS.passwordResetIp,
    );
    const userId = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    logger.info("auth.password_reset", { userId });
  } catch (error) {
    return errorState(error, "auth.password_reset_failed");
  }
  redirect("/sign-in?reset=1");
}
