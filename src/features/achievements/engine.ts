import "server-only";

import { computeStreaks, dateKeyInZone } from "@/features/progress/streaks";
import { db } from "@/lib/db/client";

import { ACHIEVEMENTS, type AchievementCode } from "./catalog";
import { type AchievementStats, evaluateAchievements } from "./rules";

export async function gatherAchievementStats(userId: string): Promise<AchievementStats> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const sessions = await db.practiceSession.findMany({
    where: { userId, status: "COMPLETED", analysis: { isNot: null } },
    orderBy: { completedAt: "asc" },
    select: {
      mode: true,
      completedAt: true,
      elapsedSec: true,
      analysis: { select: { overallScore: true, confidenceScore: true, fillerCount: true } },
    },
  });

  const keys = sessions.map((s) => dateKeyInZone(s.completedAt!, user.timezone));
  const streaks = computeStreaks(keys, dateKeyInZone(new Date(), user.timezone));
  const last = sessions.at(-1);

  return {
    completedSessions: sessions.length,
    longestStreak: streaks.longest,
    latest: last?.analysis
      ? {
          overallScore: last.analysis.overallScore,
          fillerCount: last.analysis.fillerCount,
          elapsedSec: last.elapsedSec,
        }
      : null,
    highConfidenceSessions: sessions.filter((s) => (s.analysis?.confidenceScore ?? 0) >= 85).length,
    strongInterviewSessions: sessions.filter(
      (s) => s.mode === "INTERVIEW" && (s.analysis?.overallScore ?? 0) >= 80,
    ).length,
    strongPresentationSessions: sessions.filter(
      (s) => s.mode === "PRESENTATION" && (s.analysis?.overallScore ?? 0) >= 80,
    ).length,
    anyPerfectScore: sessions.some((s) => s.analysis?.overallScore === 100),
    anyCleanSession: sessions.some(
      (s) => s.analysis?.fillerCount === 0 && (s.elapsedSec ?? 0) >= 30,
    ),
  };
}

/**
 * Idempotently unlocks earned achievements. Safe to call repeatedly (retries,
 * refreshes): the composite primary key + skipDuplicates prevents duplicates,
 * and notifications are only created for achievements that were newly inserted.
 */
export async function processAchievementsForSession(
  userId: string,
  sessionId: string | null,
): Promise<AchievementCode[]> {
  const earned = evaluateAchievements(await gatherAchievementStats(userId));
  if (!earned.length) return [];

  return db.$transaction(async (tx) => {
    const existing = await tx.userAchievement.findMany({
      where: { userId, achievementId: { in: earned } },
      select: { achievementId: true },
    });
    const have = new Set(existing.map((e) => e.achievementId));
    const fresh = earned.filter((code) => !have.has(code));
    if (!fresh.length) return [];

    const { count } = await tx.userAchievement.createMany({
      data: fresh.map((achievementId) => ({ userId, achievementId, sessionId })),
      skipDuplicates: true,
    });
    if (count === 0) return [];

    const prefs = await tx.userPreferences.findUnique({
      where: { userId },
      select: { inAppNotifications: true },
    });
    if (prefs?.inAppNotifications ?? true) {
      await tx.notification.createMany({
        data: fresh.map((code) => {
          const def = ACHIEVEMENTS.find((a) => a.id === code)!;
          return {
            userId,
            type: "ACHIEVEMENT" as const,
            title: `Achievement unlocked: ${def.name}`,
            body: def.description,
            href: "/achievements",
          };
        }),
      });
    }
    return fresh;
  });
}

/** Unlocks achievements and sends their emails (email failures never block). */
export async function processAchievementsAndNotify(userId: string, sessionId: string | null) {
  const unlocked = await processAchievementsForSession(userId, sessionId);
  if (unlocked.length) {
    const { sendAchievementEmails } = await import("@/features/notifications/service");
    await sendAchievementEmails(userId, unlocked).catch(() => 0);
  }
  return unlocked;
}
