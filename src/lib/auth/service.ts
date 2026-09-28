import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import type { SignUpInput } from "@/lib/validation/auth";

import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
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
