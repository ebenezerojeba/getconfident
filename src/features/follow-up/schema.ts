import { z } from "zod";

/** Maximum follow-up questions per session (keeps sessions focused and costs bounded). */
export const MAX_FOLLOW_UPS = 3;

export const followUpQuestionSchema = z.object({
  question: z.string().trim().min(5).max(300),
  /** Why this question follows from what the speaker said. */
  rationale: z.string().trim().min(3).max(300),
});
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;

export const followUpEvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.string().trim().min(3).max(300),
  strengths: z.array(z.string().trim().min(1).max(200)).min(1).max(3),
  improvements: z.array(z.string().trim().min(1).max(200)).min(1).max(3),
});
export type FollowUpEvaluation = z.infer<typeof followUpEvaluationSchema>;

/** Loose shapes for raw model output (repaired before strict validation). */
export const llmFollowUpQuestionSchema = z.object({
  question: z.string(),
  rationale: z.string(),
});
export const llmFollowUpEvaluationSchema = z.object({
  score: z.number(),
  verdict: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});
