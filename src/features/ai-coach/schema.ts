import { z } from "zod";

import { Difficulty, PracticeMode } from "@/generated/prisma/enums";

/**
 * Evidence basis for every judgement, so the UI can distinguish what was
 * measured from what was inferred, and never invent unavailable metrics.
 */
export const BASIS = ["observed", "inferred", "unavailable"] as const;
export type Basis = (typeof BASIS)[number];

export const DIMENSIONS = [
  { key: "clarity", label: "Clarity" },
  { key: "confidence", label: "Confidence" },
  { key: "grammar", label: "Grammar" },
  { key: "sentenceStructure", label: "Sentence structure" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "organization", label: "Organization" },
  { key: "flow", label: "Flow" },
  { key: "storytelling", label: "Storytelling" },
  { key: "persuasiveness", label: "Persuasiveness" },
  { key: "pace", label: "Pace" },
  { key: "pauses", label: "Pauses" },
  { key: "fillerWords", label: "Filler words" },
  { key: "professionalism", label: "Professionalism" },
  { key: "tone", label: "Tone" },
  { key: "energy", label: "Energy" },
  { key: "overallEffectiveness", label: "Overall effectiveness" },
] as const;
export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export const TOASTMASTERS_CRITERIA = [
  { key: "introduction", label: "Introduction" },
  { key: "body", label: "Body" },
  { key: "conclusion", label: "Conclusion" },
  { key: "transitions", label: "Transitions" },
  { key: "confidence", label: "Confidence" },
  { key: "eyeContact", label: "Eye contact" },
  { key: "voiceVariety", label: "Voice variety" },
  { key: "grammar", label: "Grammar" },
  { key: "timing", label: "Timing" },
  { key: "audienceEngagement", label: "Audience engagement" },
  { key: "persuasiveness", label: "Persuasiveness" },
  { key: "overall", label: "Overall" },
] as const;
export type ToastmastersKey = (typeof TOASTMASTERS_CRITERIA)[number]["key"];

/** Criteria that require real video analysis; always unavailable until that pipeline exists. */
export const VISUAL_ONLY: readonly ToastmastersKey[] = ["eyeContact"];

const score = z.number().int().min(0).max(100);
const text = (max: number) => z.string().trim().min(1).max(max);

export const assessmentSchema = z
  .object({
    score: score.nullable(),
    basis: z.enum(BASIS),
    feedback: text(600),
  })
  .refine((a) => (a.basis === "unavailable") === (a.score === null), {
    error: "Score must be null exactly when the basis is 'unavailable'.",
  });
export type Assessment = z.infer<typeof assessmentSchema>;

const dimensionsShape = Object.fromEntries(DIMENSIONS.map((d) => [d.key, assessmentSchema])) as {
  [K in DimensionKey]: typeof assessmentSchema;
};
const toastmastersShape = Object.fromEntries(
  TOASTMASTERS_CRITERIA.map((c) => [c.key, assessmentSchema]),
) as { [K in ToastmastersKey]: typeof assessmentSchema };

export const coachReportSchema = z.object({
  overallScore: score,
  summary: text(800),
  dimensions: z.object(dimensionsShape),
  strengths: z.array(text(300)).min(1).max(5),
  weaknesses: z.array(text(300)).min(1).max(5),
  suggestions: z.array(text(300)).min(1).max(6),
  betterWording: z
    .array(z.object({ original: text(400), improved: text(400), why: text(300) }))
    .max(5),
  grammarCorrections: z
    .array(z.object({ original: text(400), corrected: text(400), explanation: text(300) }))
    .max(8),
  confidenceTips: z.array(text(300)).min(1).max(4),
  homework: z
    .array(z.object({ title: text(100), description: text(400) }))
    .min(1)
    .max(3),
  nextPractice: z.object({
    mode: z.enum(PracticeMode),
    difficulty: z.enum(Difficulty),
    focus: text(200),
    reason: text(300),
  }),
  modeCriteria: z.array(z.object({ name: text(80), score: score, feedback: text(400) })).max(6),
  toastmasters: z.object({
    ...toastmastersShape,
    summary: text(800),
    recommendations: z.array(text(300)).min(1).max(5),
  }),
});
export type CoachReport = z.infer<typeof coachReportSchema>;

/**
 * Loose schema for raw LLM output. Everything is tolerated here and repaired by
 * normalizeReport() before strict validation with coachReportSchema.
 */
const looseAssessment = z.object({
  score: z.number().nullable(),
  basis: z.enum(BASIS),
  feedback: z.string(),
});
export const llmReportSchema = z.object({
  overallScore: z.number(),
  summary: z.string(),
  dimensions: z.object(
    Object.fromEntries(DIMENSIONS.map((d) => [d.key, looseAssessment])) as {
      [K in DimensionKey]: typeof looseAssessment;
    },
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
  betterWording: z.array(z.object({ original: z.string(), improved: z.string(), why: z.string() })),
  grammarCorrections: z.array(
    z.object({ original: z.string(), corrected: z.string(), explanation: z.string() }),
  ),
  confidenceTips: z.array(z.string()),
  homework: z.array(z.object({ title: z.string(), description: z.string() })),
  nextPractice: z.object({
    mode: z.enum(PracticeMode),
    difficulty: z.enum(Difficulty),
    focus: z.string(),
    reason: z.string(),
  }),
  modeCriteria: z.array(z.object({ name: z.string(), score: z.number(), feedback: z.string() })),
  toastmasters: z.object({
    ...(Object.fromEntries(TOASTMASTERS_CRITERIA.map((c) => [c.key, looseAssessment])) as {
      [K in ToastmastersKey]: typeof looseAssessment;
    }),
    summary: z.string(),
    recommendations: z.array(z.string()),
  }),
});
export type LlmReport = z.infer<typeof llmReportSchema>;
