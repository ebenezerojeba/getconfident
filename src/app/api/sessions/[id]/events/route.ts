import { NextResponse } from "next/server";

import { applySessionEvent } from "@/features/practice/service";
import { parseId, parseJson, withUser } from "@/lib/api";
import { sessionEventSchema } from "@/lib/validation/practice";

export const POST = withUser<{ id: string }>(async (req, { user, params }) => {
  const event = await parseJson(req, sessionEventSchema);
  const status = await applySessionEvent(user.id, parseId(params.id, "Session"), event.type);
  return NextResponse.json({ status });
});
