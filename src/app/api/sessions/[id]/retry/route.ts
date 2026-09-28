import { after, NextResponse } from "next/server";

import { processSession, retrySessionProcessing } from "@/features/practice/service";
import { parseId, withUser } from "@/lib/api";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 300;

export const POST = withUser<{ id: string }>(
  async (_req, { user, params }) => {
    const sessionId = await retrySessionProcessing(user.id, parseId(params.id, "Session"));
    after(async () => {
      try {
        await processSession(sessionId);
      } catch (error) {
        logger.error("session.retry_crashed", { sessionId, error });
      }
    });
    return NextResponse.json({ status: "RETRYING" }, { status: 202 });
  },
  { rateLimit: { name: "ai", rule: RATE_LIMITS.aiAnalysis } },
);
