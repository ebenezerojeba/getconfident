import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { NamedIcon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ACHIEVEMENTS, type AchievementCode } from "@/features/achievements/catalog";
import {
  gatherAchievementStats,
  processAchievementsForSession,
} from "@/features/achievements/engine";
import type { AchievementStats } from "@/features/achievements/rules";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements" };

/** Progress toward each achievement, for locked badges. */
function progressFor(
  code: AchievementCode,
  s: AchievementStats,
): { value: number; target: number } | null {
  switch (code) {
    case "FIRST_PRACTICE":
      return { value: s.completedSessions, target: 1 };
    case "SEVEN_DAY_STREAK":
      return { value: s.longestStreak, target: 7 };
    case "THIRTY_DAY_STREAK":
      return { value: s.longestStreak, target: 30 };
    case "HUNDRED_SPEECHES":
      return { value: s.completedSessions, target: 100 };
    case "CONFIDENT_SPEAKER":
      return { value: s.highConfidenceSessions, target: 5 };
    case "INTERVIEW_MASTER":
      return { value: s.strongInterviewSessions, target: 10 };
    case "PRESENTATION_EXPERT":
      return { value: s.strongPresentationSessions, target: 10 };
    default:
      return null;
  }
}

export default async function AchievementsPage() {
  const user = await requireUser();
  // Idempotent reconciliation: unlocks anything already earned (e.g. if a
  // previous run was interrupted) without ever creating duplicates.
  await processAchievementsForSession(user.id, null);
  const [unlocked, stats] = await Promise.all([
    db.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievementId: true, unlockedAt: true },
    }),
    gatherAchievementStats(user.id),
  ]);
  const unlockedAt = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        description={`${unlocked.length} of ${ACHIEVEMENTS.length} unlocked`}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const date = unlockedAt.get(a.id);
          const prog = !date ? progressFor(a.id, stats) : null;
          return (
            <li
              key={a.id}
              data-testid={`achievement-${a.id}`}
              data-unlocked={date ? "true" : "false"}
              className={cn("rounded-2xl border bg-card p-5", !date && "bg-muted/30")}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                    date ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {date ? (
                    <NamedIcon name={a.icon} className="size-6" />
                  ) : (
                    <Lock className="size-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 space-y-1">
                  <h2 className="font-semibold">{a.name}</h2>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  {date ? (
                    <Badge variant="secondary">
                      Unlocked {date.toLocaleDateString("en", { dateStyle: "medium" })}
                    </Badge>
                  ) : (
                    <span className="sr-only">Locked</span>
                  )}
                </div>
              </div>
              {prog ? (
                <div className="mt-4 space-y-1">
                  <Progress
                    value={Math.min(100, (prog.value / prog.target) * 100)}
                    aria-label={`${a.name} progress`}
                  />
                  <p className="text-right text-xs text-muted-foreground tabular-nums">
                    {Math.min(prog.value, prog.target)} / {prog.target}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
