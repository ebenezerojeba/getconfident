import { z } from "zod";

import { TIMER_OPTIONS_SEC } from "@/config/practice";
import { Difficulty, PracticeMode, TopicCategory } from "@/generated/prisma/enums";

export const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+$/i, "Invalid id.");

export const topicRequestSchema = z.object({
  category: z.enum(TopicCategory).nullish(),
  difficulty: z.enum(Difficulty).nullish(),
  mode: z.enum(PracticeMode).nullish(),
  skipTopicId: idSchema.nullish(),
});

export const createSessionSchema = z.object({
  topicId: idSchema,
  mode: z.enum(PracticeMode),
  difficulty: z.enum(Difficulty),
  targetDurationSec: z.coerce
    .number()
    .int()
    .refine((n) => (TIMER_OPTIONS_SEC as readonly number[]).includes(n), {
      error: "Choose one of the available timer lengths.",
    }),
  withVideo: z.boolean(),
});

export const sessionEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("countdown") }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("restart") }),
  z.object({ type: z.literal("cancel") }),
  z.object({ type: z.literal("voice-only") }),
]);

export const uploadMetaSchema = z.object({
  kind: z.enum(["VIDEO", "AUDIO"]),
  durationMs: z.coerce
    .number()
    .int()
    .min(0)
    .max(11 * 60 * 1000),
  elapsedSec: z.coerce
    .number()
    .int()
    .min(0)
    .max(11 * 60),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
