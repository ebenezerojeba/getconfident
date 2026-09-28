import { NextResponse } from "next/server";

import { createPracticeSession } from "@/features/practice/service";
import { parseJson, withUser } from "@/lib/api";
import { createSessionSchema } from "@/lib/validation/practice";

export const POST = withUser(async (req, { user }) => {
  const input = await parseJson(req, createSessionSchema);
  const session = await createPracticeSession(user.id, input);
  return NextResponse.json({ session }, { status: 201 });
});
