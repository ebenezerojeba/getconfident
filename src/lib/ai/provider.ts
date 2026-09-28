import "server-only";

import { AppError } from "@/lib/errors";

export type AIProviderName = "openai" | "mock";

/**
 * Selects the AI/transcription provider. The mock provider exists only for
 * local development and automated tests without credentials: it does NOT
 * analyze real speech and must never be used to serve real users.
 */
export function getAIProviderName(): AIProviderName {
  const configured = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (configured === "mock") {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && process.env.ALLOW_MOCK_AI_IN_PRODUCTION !== "1") {
      throw new AppError("EXTERNAL_SERVICE", "AI service is not configured.", {
        cause: new Error("AI_PROVIDER=mock is not allowed in production"),
      });
    }
    return "mock";
  }
  return "openai";
}

export const isMockAI = () => getAIProviderName() === "mock";
