import "server-only";

import { computeProgress } from "@/features/progress/analytics";
import { dateKeyInZone } from "@/features/progress/streaks";
import { getEmailProvider, isEmailConfigured } from "@/lib/email/client";
import { achievementEmail, practiceReminderEmail, weeklySummaryEmail } from "@/lib/email/templates";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";

import { localTimeIn, shouldSendPracticeReminder, shouldSendWeeklySummary } from "./rules";

/** Email failures never break the caller: they are logged and reported. */
async function trySend(
  message: Parameters<ReturnType<typeof getEmailProvider>["send"]>[0],
  event: string,
) {
  try {
    await getEmailProvider().send(message);
    return true;
  } catch (error) {
    logger.error(event, { error });
    return false;
  }
}

export async function sendAchievementEmails(userId: string, achievementIds: string[]) {
  if (!achievementIds.length) return 0;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, preferences: { select: { achievementEmails: true } } },
  });
  if (!user || user.preferences?.achievementEmails === false) return 0;
  const achievements = await db.achievement.findMany({ where: { id: { in: achievementIds } } });
  let sent = 0;
  for (const a of achievements) {
    const ok = await trySend(
      achievementEmail({ to: user.email, name: user.name, achievement: a }),
      "email.achievement_failed",
    );
    if (ok) sent++;
  }
  return sent;
}

export type CronResult = { reminders: number; summaries: number; considered: number };

/**
 * Sends due reminder and weekly-summary emails. Designed to run hourly; each
 * user receives at most one of each per local day (tracked via Notification rows).
 */
export async function runNotificationCron(now = new Date()): Promise<CronResult> {
  const users = await db.user.findMany({
    where: {
      preferences: { OR: [{ practiceReminders: true }, { weeklySummary: true }] },
    },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      preferences: {
        select: { practiceReminders: true, reminderHour: true, weeklySummary: true },
      },
    },
  });

  let reminders = 0;
  let summaries = 0;

  for (const user of users) {
    const prefs = user.preferences;
    if (!prefs) continue;
    const local = localTimeIn(user.timezone, now);

    const [lastReminder, lastSummary, lastSession] = await Promise.all([
      db.notification.findFirst({
        where: { userId: user.id, type: "REMINDER" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.notification.findFirst({
        where: { userId: user.id, type: "WEEKLY_SUMMARY" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.practiceSession.findFirst({
        where: { userId: user.id, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

    const todayKey = local.dateKey;
    const practicedToday =
      Boolean(lastSession?.completedAt) &&
      dateKeyInZone(lastSession!.completedAt!, user.timezone) === todayKey;

    if (
      shouldSendPracticeReminder({
        enabled: prefs.practiceReminders,
        reminderHour: prefs.reminderHour,
        localHour: local.hour,
        practicedToday,
        lastReminderDateKey: lastReminder
          ? dateKeyInZone(lastReminder.createdAt, user.timezone)
          : null,
        todayKey,
      })
    ) {
      const progress = await getUserStreak(user.id, user.timezone, now);
      const ok = await trySend(
        practiceReminderEmail({ to: user.email, name: user.name, streak: progress.streak }),
        "email.reminder_failed",
      );
      await db.notification.create({
        data: {
          userId: user.id,
          type: "REMINDER",
          createdAt: now,
          title: "Time to practice",
          body:
            progress.streak > 0
              ? `Keep your ${progress.streak}-day streak alive.`
              : "A short session keeps the habit going.",
          href: "/practice",
        },
      });
      if (ok) reminders++;
    }

    if (
      shouldSendWeeklySummary({
        enabled: prefs.weeklySummary,
        localHour: local.hour,
        localWeekday: local.weekday,
        lastSummaryDateKey: lastSummary
          ? dateKeyInZone(lastSummary.createdAt, user.timezone)
          : null,
        todayKey,
      })
    ) {
      const summary = await getWeeklySummary(user.id, user.timezone, now);
      const ok = await trySend(
        weeklySummaryEmail({ to: user.email, name: user.name, ...summary }),
        "email.weekly_failed",
      );
      await db.notification.create({
        data: {
          userId: user.id,
          type: "WEEKLY_SUMMARY",
          createdAt: now,
          title: "Your weekly summary",
          body: `${summary.sessions} session(s) this week. Average score: ${summary.averageScore ?? "—"}.`,
          href: "/progress",
        },
      });
      if (ok) summaries++;
    }
  }

  logger.info("notifications.cron", {
    considered: users.length,
    reminders,
    summaries,
    emailConfigured: isEmailConfigured(),
  });
  return { reminders, summaries, considered: users.length };
}

async function loadPoints(userId: string, since?: Date) {
  const rows = await db.practiceSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      analysis: { isNot: null },
      ...(since ? { completedAt: { gte: since } } : {}),
    },
    orderBy: { completedAt: "asc" },
    select: {
      id: true,
      completedAt: true,
      mode: true,
      elapsedSec: true,
      analysis: {
        select: {
          overallScore: true,
          confidenceScore: true,
          grammarScore: true,
          fillerPerMinute: true,
          wordsPerMinute: true,
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    completedAt: r.completedAt!,
    mode: r.mode,
    elapsedSec: r.elapsedSec,
    overallScore: r.analysis!.overallScore,
    confidenceScore: r.analysis!.confidenceScore,
    grammarScore: r.analysis!.grammarScore,
    fillerPerMinute: r.analysis!.fillerPerMinute,
    wordsPerMinute: r.analysis!.wordsPerMinute,
  }));
}

async function getUserStreak(userId: string, timeZone: string, now: Date) {
  const progress = computeProgress(await loadPoints(userId), timeZone, now);
  return { streak: progress.streak.current };
}

async function getWeeklySummary(userId: string, timeZone: string, now: Date) {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const progress = computeProgress(await loadPoints(userId, since), timeZone, now);
  const all = computeProgress(await loadPoints(userId), timeZone, now);
  return {
    sessions: progress.totalSessions,
    averageScore: progress.averageScore,
    fillerPerMinute: progress.series.length
      ? Math.round(
          (progress.series.reduce((s, p) => s + p.fillerPerMinute, 0) / progress.series.length) *
            10,
        ) / 10
      : null,
    streak: all.streak.current,
  };
}
