import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PRACTICE_MODES } from "@/config/practice-modes";
import type { PracticeMode } from "@/generated/prisma/enums";
import { PracticeSetup } from "@/features/practice/components/practice-setup";
import { dailySessionsRemaining } from "@/features/practice/daily-limit";
import { getDailyChallenge } from "@/features/topics/service";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = PRACTICE_MODES.some((m) => m.id === mode) ? (mode as PracticeMode) : null;
  const user = await requireUser();
  const [prefs, daily, allowance] = await Promise.all([
    db.userPreferences.findUnique({ where: { userId: user.id } }),
    getDailyChallenge(user.timezone),
    dailySessionsRemaining(user.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Practice"
        description="Choose how you want to practice, get a topic, then speak."
      />
      {allowance.remaining <= 3 ? (
        <Alert role="status">
          <AlertDescription>
            {allowance.remaining === 0
              ? `You've used all ${allowance.limit} practice sessions for today. Come back tomorrow to keep your streak going.`
              : `${allowance.remaining} practice session${allowance.remaining === 1 ? "" : "s"} left today.`}
          </AlertDescription>
        </Alert>
      ) : null}
      <PracticeSetup
        defaults={{
          mode: prefs?.preferredMode ?? "IMPROMPTU",
          difficulty: prefs?.preferredDifficulty ?? "MEDIUM",
          durationSec: prefs?.preferredDurationSec ?? 120,
        }}
        dailyChallenge={daily}
        initialMode={initialMode}
      />
    </div>
  );
}
