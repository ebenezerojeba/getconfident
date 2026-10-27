import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getMode } from "@/config/practice-modes";
import { ProcessingView } from "@/features/practice/components/processing-view";
import { SessionRunner } from "@/features/practice/components/session-runner";
import { recordingPrefix } from "@/features/practice/service";
import { UPLOADABLE_STATUSES } from "@/features/practice/state-machine";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Speaking session" };

export default async function PracticeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Ownership enforced in the query itself.
  const session = await db.practiceSession.findFirst({ where: { id, userId: user.id } });
  if (!session) notFound();

  if (session.status === "COMPLETED") redirect(`/sessions/${session.id}`);
  if (session.status === "CANCELLED") redirect("/practice");

  if (UPLOADABLE_STATUSES.includes(session.status)) {
    return (
      <SessionRunner
        session={{
          id: session.id,
          topicText: session.topicText,
          modeName: getMode(session.mode).name,
          targetDurationSec: session.targetDurationSec,
          withVideo: session.withVideo,
        }}
        directUploadPrefix={
          process.env.STORAGE_DRIVER === "blob" ? recordingPrefix(user.id, session.id) : undefined
        }
      />
    );
  }

  return (
    <ProcessingView
      sessionId={session.id}
      initialStatus={session.status}
      initialFailure={session.failureReason}
    />
  );
}
