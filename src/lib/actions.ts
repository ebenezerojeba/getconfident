import type { z } from "zod";

import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Serializable result shape for form server actions used with useActionState. */
export type ActionState<TValues = Record<string, string>> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Echo back non-sensitive values so the form can be repopulated. */
  values?: Partial<TValues>;
};

export const idleState: ActionState = { status: "idle" };

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Converts any thrown error into a safe ActionState. Unknown errors are logged, not leaked. */
export function errorState(error: unknown, event: string): ActionState {
  if (isAppError(error)) {
    return { status: "error", message: error.message, fieldErrors: error.fieldErrors };
  }
  logger.error(event, { error });
  return { status: "error", message: "Something went wrong. Please try again." };
}
