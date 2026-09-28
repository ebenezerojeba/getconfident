import { NextResponse } from "next/server";

import { getRandomTopic } from "@/features/topics/service";
import { parseJson, withUser } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { topicRequestSchema } from "@/lib/validation/practice";

export const POST = withUser(
  async (req, { user }) => {
    const filters = await parseJson(req, topicRequestSchema);
    const topic = await getRandomTopic(user.id, filters);
    return NextResponse.json({ topic });
  },
  { rateLimit: { name: "topics", rule: RATE_LIMITS.topics } },
);
