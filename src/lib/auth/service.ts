import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import type { SignUpInput } from "@/lib/validation/auth";

import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { createResetToken, parseResetToken, verifyResetToken } from "./password-reset";
import { invalidateUserSessions } from "./session";

export const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists. Try signing in.";
export const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";

/** Creates the user and default preferences atomically. Input must be validated. */
export async function registerUser(input: SignUpInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        preferences: { create: {} },
      },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("CONFLICT", DUPLICATE_EMAIL_MESSAGE, {
        fieldErrors: { email: [DUPLICATE_EMAIL_MESSAGE] },
      });
    }
    throw error;
  }
}

/**
 * Returns the user id for valid credentials, otherwise null. Always performs a
 * hash verification so timing doesn't reveal whether the email exists.
 */
export async function authenticate(email: string, password: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    await burnPasswordCheck(password);
    return null;
  }
  return (await verifyPassword(user.passwordHash, password)) ? user.id : null;
}

/** Verifies the current password, stores the new hash and signs out other sessions. */
export async function changePassword(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError("VALIDATION", "Your current password is incorrect.", {
      fieldErrors: { currentPassword: ["Your current password is incorrect."] },
    });
  }
  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });
  await invalidateUserSessions(userId, currentSessionId);
}

export const INVALID_RESET_LINK_MESSAGE =
  "This reset link is invalid or has expired. Request a new one.";

/**
 * Builds a reset link for the account with this email, or returns null when
 * there is no such account. Callers must respond the same way either way.
 */
export async function createPasswordResetLink(email: string, baseUrl: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  if (!user) return null;
  const token = createResetToken(user);
  return {
    user: { name: user.name, email: user.email },
    url: `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`,
  };
}

/** Loads the user a reset token belongs to, if the token is still valid. */
export async function findUserForResetToken(token: string) {
  const parsed = parseResetToken(token);
  if (!parsed || parsed.expiresAt < Date.now()) return null;
  const user = await db.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, passwordHash: true },
  });
  return user && verifyResetToken(token, user) ? user : null;
}

/** Sets a new password from a reset link and signs the user out everywhere. */
export async function resetPasswordWithToken(token: string, newPassword: string) {
  const user = await findUserForResetToken(token);
  if (!user) throw new AppError("VALIDATION", INVALID_RESET_LINK_MESSAGE);
  const passwordHash = await hashPassword(newPassword);
  // Guarded on the old hash, so two concurrent uses of one link can't both win.
  const { count } = await db.user.updateMany({
    where: { id: user.id, passwordHash: user.passwordHash },
    data: { passwordHash, passwordChangedAt: new Date() },
  });
  if (count !== 1) throw new AppError("VALIDATION", INVALID_RESET_LINK_MESSAGE);
  await invalidateUserSessions(user.id);
  return user.id;
}
