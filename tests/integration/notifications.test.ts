import nodemailer from "nodemailer";
import { processAchievementsAndNotify } from "@/features/achievements/engine";
import { runNotificationCron } from "@/features/notifications/service";
import { db } from "@/lib/db/client";
import { resetEmailTransport } from "@/lib/email/client";

import { createTestUser } from "../support/factories";

/** 2026-09-21 is a Monday. 18:00 UTC and 09:00 UTC are the reminder/summary hours. */
const MONDAY_9 = new Date("2026-09-21T09:00:00Z");
const MONDAY_18 = new Date("2026-09-21T18:00:00Z");

async function setPrefs(userId: string, data: Record<string, unknown>) {
  await db.userPreferences.update({ where: { userId }, data });
}

describe("notification cron", () => {
  it("sends a reminder at the user's local hour, once per day", async () => {
    const user = await createTestUser({ timezone: "UTC" });
    await setPrefs(user.id, { practiceReminders: true, reminderHour: 18, weeklySummary: false });

    const first = await runNotificationCron(MONDAY_18);
    expect(first.reminders).toBeGreaterThanOrEqual(1);
    const notifications = await db.notification.findMany({
      where: { userId: user.id, type: "REMINDER" },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].href).toBe("/practice");

    // Running again the same day sends nothing more.
    await runNotificationCron(MONDAY_18);
    expect(await db.notification.count({ where: { userId: user.id, type: "REMINDER" } })).toBe(1);
  });

  it("does not remind at other hours or when reminders are off", async () => {
    const user = await createTestUser({ timezone: "UTC" });
    await setPrefs(user.id, { practiceReminders: true, reminderHour: 7, weeklySummary: false });
    await runNotificationCron(MONDAY_18);
    expect(await db.notification.count({ where: { userId: user.id } })).toBe(0);

    await setPrefs(user.id, { practiceReminders: false, reminderHour: 18 });
    await runNotificationCron(MONDAY_18);
    expect(await db.notification.count({ where: { userId: user.id } })).toBe(0);
  });

  it("respects the user's time zone", async () => {
    // 18:00 in Tokyo is 09:00 UTC.
    const user = await createTestUser({ timezone: "Asia/Tokyo" });
    await setPrefs(user.id, { practiceReminders: true, reminderHour: 18, weeklySummary: false });
    await runNotificationCron(MONDAY_9);
    expect(await db.notification.count({ where: { userId: user.id, type: "REMINDER" } })).toBe(1);
  });

  it("sends the weekly summary on Monday morning only", async () => {
    const user = await createTestUser({ timezone: "UTC" });
    await setPrefs(user.id, { practiceReminders: false, weeklySummary: true });
    await runNotificationCron(new Date("2026-09-22T09:00:00Z")); // Tuesday
    expect(await db.notification.count({ where: { userId: user.id } })).toBe(0);

    await runNotificationCron(MONDAY_9);
    const summaries = await db.notification.findMany({
      where: { userId: user.id, type: "WEEKLY_SUMMARY" },
    });
    expect(summaries).toHaveLength(1);
    expect(summaries[0].body).toMatch(/session/);
  });

  it("never throws when email delivery fails", async () => {
    const user = await createTestUser({ timezone: "UTC" });
    await setPrefs(user.id, { practiceReminders: true, reminderHour: 18, weeklySummary: false });
    const keys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"] as const;
    const original = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    Object.assign(process.env, {
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "coach@example.com",
      SMTP_PASSWORD: "test-password",
      EMAIL_FROM: "Coach <coach@example.com>",
    });
    resetEmailTransport();
    const transportSpy = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: vi.fn().mockRejectedValue(new Error("network down")),
    } as never);
    try {
      const result = await runNotificationCron(MONDAY_18);
      expect(result.reminders).toBe(0); // delivery failed
      // The in-app notification is still recorded.
      expect(await db.notification.count({ where: { userId: user.id, type: "REMINDER" } })).toBe(1);
    } finally {
      transportSpy.mockRestore();
      resetEmailTransport();
      for (const k of keys) {
        if (original[k] === undefined) delete process.env[k];
        else process.env[k] = original[k];
      }
    }
  });
});

describe("achievement notifications", () => {
  it("creates in-app notifications and is idempotent", async () => {
    const user = await createTestUser();
    const topic = await db.topic.findFirstOrThrow();
    await db.practiceSession.create({
      data: {
        userId: user.id,
        topicId: topic.id,
        topicText: topic.text,
        mode: "IMPROMPTU",
        difficulty: "EASY",
        targetDurationSec: 60,
        elapsedSec: 60,
        status: "COMPLETED",
        completedAt: new Date(),
        analysis: {
          create: {
            overallScore: 80,
            confidenceScore: 70,
            grammarScore: 75,
            clarityScore: 78,
            wordCount: 120,
            fillerCount: 2,
            fillerPerMinute: 2,
            report: {},
            fillerAnalysis: {},
            provider: "mock",
            model: "mock",
          },
        },
      },
    });

    const unlocked = await processAchievementsAndNotify(user.id, null);
    expect(unlocked).toContain("FIRST_PRACTICE");
    const notifications = await db.notification.findMany({
      where: { userId: user.id, type: "ACHIEVEMENT" },
    });
    expect(notifications).toHaveLength(unlocked.length);

    expect(await processAchievementsAndNotify(user.id, null)).toEqual([]);
    expect(await db.notification.count({ where: { userId: user.id, type: "ACHIEVEMENT" } })).toBe(
      unlocked.length,
    );
  });

  it("skips achievement emails when the user opted out", async () => {
    const user = await createTestUser();
    await setPrefs(user.id, { achievementEmails: false });
    const { sendAchievementEmails } = await import("@/features/notifications/service");
    expect(await sendAchievementEmails(user.id, ["FIRST_PRACTICE"])).toBe(0);
  });
});
