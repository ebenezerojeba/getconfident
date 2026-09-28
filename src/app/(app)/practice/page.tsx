import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PRACTICE_MODES } from "@/config/practice-modes";
import type { PracticeMode } from "@/generated/prisma/enums";
import { PracticeSetup } from "@/features/practice/components/practice-setup";
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
  const [prefs, daily] = await Promise.all([
    db.userPreferences.findUnique({ where: { userId: user.id } }),
    getDailyChallenge(user.timezone),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Practice"
        description="Choose how you want to practice, get a topic, then speak."
      />
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
