import { z } from "zod";

import { TIMER_OPTIONS_SEC } from "@/config/practice";
import { TopicCategory } from "@/generated/prisma/enums";

import { nameSchema } from "./auth";

export const timezoneSchema = z
  .string()
  .max(64)
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { error: "Unknown time zone." },
  );

export const durationSchema = z.coerce
  .number()
  .int()
  .refine((n) => (TIMER_OPTIONS_SEC as readonly number[]).includes(n), {
    error: "Choose one of the available timer lengths.",
  });

export const categoriesSchema = z
  .array(z.enum(TopicCategory))
  .max(Object.keys(TopicCategory).length)
  .transform((list) => [...new Set(list)]);

export const onboardingSchema = z.object({
  name: nameSchema,
  goal: z.string().trim().max(200, "Keep your goal under 200 characters.").optional().default(""),
  timezone: timezoneSchema.catch("UTC"),
  preferredDurationSec: durationSchema,
  preferredCategories: categoriesSchema,
});

export const profileSchema = z.object({
  name: nameSchema,
  goal: z.string().trim().max(200, "Keep your goal under 200 characters.").optional().default(""),
  timezone: timezoneSchema,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
