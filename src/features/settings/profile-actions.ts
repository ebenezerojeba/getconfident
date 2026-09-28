"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionState, errorState, fieldErrorsFrom } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { profileSchema } from "@/lib/validation/profile";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    goal: formData.get("goal") ?? "",
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        goal: parsed.data.goal || null,
        timezone: parsed.data.timezone,
      },
    });
  } catch (error) {
    return errorState(error, "profile.update_failed");
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved." };
}
