import { NextResponse } from "next/server";

import { createNextFollowUp } from "@/features/follow-up/service";
import { parseId, withUser } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 120;

export const POST = withUser<{ id: string }>(
  async (_req, { user, params }) => {
    const q = await createNextFollowUp(user.id, parseId(params.id, "Session"));
    return NextResponse.json({
      question: { id: q.id, order: q.order, question: q.question },
    });
  },
  { rateLimit: { name: "follow-up", rule: RATE_LIMITS.followUp } },
);
