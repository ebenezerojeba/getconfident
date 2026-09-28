import { NextResponse } from "next/server";

import { deleteSession, getOwnedSession } from "@/features/practice/service";
import { STATUS_LABEL } from "@/features/practice/state-machine";
import { parseId, withUser } from "@/lib/api";

/** Lightweight status endpoint used for polling while a session is processed. */
export const GET = withUser<{ id: string }>(async (_req, { user, params }) => {
  const session = await getOwnedSession(user.id, parseId(params.id, "Session"));
  return NextResponse.json(
    {
      id: session.id,
      status: session.status,
      label: STATUS_LABEL[session.status],
      failureReason: session.failureReason,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});

export const DELETE = withUser<{ id: string }>(async (_req, { user, params }) => {
  await deleteSession(user.id, parseId(params.id, "Session"));
  return new NextResponse(null, { status: 204 });
});
