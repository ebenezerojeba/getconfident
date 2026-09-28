import { z } from "zod";

import { Difficulty, PracticeMode, ThemePreference, TopicCategory } from "@/generated/prisma/enums";

import { durationSchema } from "./profile";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
] as const;

export const practicePreferencesSchema = z.object({
  preferredMode: z.enum(PracticeMode),
  preferredDifficulty: z.enum(Difficulty),
  preferredDurationSec: durationSchema,
  preferredCategories: z.array(z.enum(TopicCategory)).transform((c) => [...new Set(c)]),
  language: z.enum(LANGUAGES.map((l) => l.code) as [string, ...string[]]),
});

export const appearanceSchema = z.object({
  theme: z.enum(ThemePreference),
});

export const notificationPreferencesSchema = z.object({
  practiceReminders: z.coerce.boolean(),
  reminderHour: z.coerce.number().int().min(0).max(23).nullable().catch(null),
  weeklySummary: z.coerce.boolean(),
  achievementEmails: z.coerce.boolean(),
  inAppNotifications: z.coerce.boolean(),
});

export const privacySchema = z.object({
  keepRecordings: z.coerce.boolean(),
});

/** Deleting an account requires typing the confirmation phrase exactly. */
export const DELETE_CONFIRMATION = "DELETE MY ACCOUNT";
export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION, {
    error: `Type "${DELETE_CONFIRMATION}" exactly to confirm.`,
  }),
  password: z.string().min(1, "Enter your password to confirm."),
});
