"use server";

import { redirect } from "next/navigation";

import { type ActionState, errorState, fieldErrorsFrom } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { onboardingSchema } from "@/lib/validation/profile";

export async function completeOnboardingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    goal: formData.get("goal") ?? "",
    timezone: formData.get("timezone") ?? "UTC",
    preferredDurationSec: formData.get("preferredDurationSec"),
    preferredCategories: formData.getAll("preferredCategories"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { name, goal, timezone, preferredDurationSec, preferredCategories } = parsed.data;
  try {
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { name, goal: goal || null, timezone, onboardedAt: user.onboardedAt ?? new Date() },
      }),
      db.userPreferences.upsert({
        where: { userId: user.id },
        create: { userId: user.id, preferredDurationSec, preferredCategories },
        update: { preferredDurationSec, preferredCategories },
      }),
    ]);
  } catch (error) {
    return errorState(error, "onboarding.save_failed");
  }
  redirect("/dashboard?welcome=1");
}
