"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionState, errorState, fieldErrorsFrom } from "@/lib/actions";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/current-user";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { deleteUserStorage } from "@/lib/storage/cleanup";
import {
  appearanceSchema,
  deleteAccountSchema,
  notificationPreferencesSchema,
  practicePreferencesSchema,
  privacySchema,
} from "@/lib/validation/settings";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");
  return session;
}

const checkbox = (form: FormData, name: string) => form.get(name) === "on";

export async function updatePracticePreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession();
  const parsed = practicePreferencesSchema.safeParse({
    preferredMode: formData.get("preferredMode"),
    preferredDifficulty: formData.get("preferredDifficulty"),
    preferredDurationSec: formData.get("preferredDurationSec"),
    preferredCategories: formData.getAll("preferredCategories"),
    language: formData.get("language"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check your choices.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    await db.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    return errorState(error, "settings.practice_failed");
  }
  revalidatePath("/settings");
  return { status: "success", message: "Practice preferences saved." };
}

export async function updateAppearanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession();
  const parsed = appearanceSchema.safeParse({ theme: formData.get("theme") });
  if (!parsed.success) return { status: "error", message: "Unknown theme." };
  try {
    await db.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, theme: parsed.data.theme },
      update: { theme: parsed.data.theme },
    });
  } catch (error) {
    return errorState(error, "settings.appearance_failed");
  }
  revalidatePath("/settings");
  return { status: "success", message: "Theme saved for this account." };
}

export async function updateNotificationsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession();
  const parsed = notificationPreferencesSchema.safeParse({
    practiceReminders: checkbox(formData, "practiceReminders"),
    reminderHour: formData.get("reminderHour"),
    weeklySummary: checkbox(formData, "weeklySummary"),
    achievementEmails: checkbox(formData, "achievementEmails"),
    inAppNotifications: checkbox(formData, "inAppNotifications"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check your choices.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    await db.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    return errorState(error, "settings.notifications_failed");
  }
  revalidatePath("/settings");
  return { status: "success", message: "Notification preferences saved." };
}

export async function updatePrivacyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession();
  const parsed = privacySchema.safeParse({ keepRecordings: checkbox(formData, "keepRecordings") });
  if (!parsed.success) return { status: "error", message: "Please check your choices." };
  try {
    await db.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    return errorState(error, "settings.privacy_failed");
  }
  revalidatePath("/settings");
  return { status: "success", message: "Privacy preferences saved." };
}

/**
 * Permanently deletes the account: database rows cascade from User, stored
 * recordings are removed, and the session cookie is cleared.
 */
export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireSession();
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please confirm deletion.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    await enforceRateLimit(`account:delete:${user.id}`, RATE_LIMITS.passwordChange);
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record || !(await verifyPassword(record.passwordHash, parsed.data.password))) {
      throw new AppError("VALIDATION", "That password is incorrect.", {
        fieldErrors: { password: ["That password is incorrect."] },
      });
    }
    await db.user.delete({ where: { id: user.id } });
    await deleteUserStorage(user.id);
    logger.info("account.deleted", { userId: user.id });
  } catch (error) {
    return errorState(error, "account.delete_failed");
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/?deleted=1");
}
