import { escapeHtml, practiceReminderEmail, weeklySummaryEmail } from "@/lib/email/templates";

import {
  DEFAULT_REMINDER_HOUR,
  localTimeIn,
  shouldSendPracticeReminder,
  shouldSendWeeklySummary,
} from "./rules";

describe("localTimeIn", () => {
  it("resolves local hour, ISO weekday and date key", () => {
    // 2026-09-19T23:30Z is Saturday 23:30 UTC, Sunday 08:30 in Tokyo.
    const t = new Date("2026-09-19T23:30:00Z");
    expect(localTimeIn("UTC", t)).toEqual({ hour: 23, weekday: 6, dateKey: "2026-09-19" });
    expect(localTimeIn("Asia/Tokyo", t)).toEqual({ hour: 8, weekday: 7, dateKey: "2026-09-20" });
  });
  it("falls back to UTC for unknown zones", () => {
    expect(localTimeIn("Not/AZone", new Date("2026-09-19T10:00:00Z")).hour).toBe(10);
  });
  it("treats midnight as hour 0", () => {
    expect(localTimeIn("UTC", new Date("2026-09-19T00:15:00Z")).hour).toBe(0);
  });
});

describe("shouldSendPracticeReminder", () => {
  const base = {
    enabled: true,
    reminderHour: 18,
    localHour: 18,
    practicedToday: false,
    lastReminderDateKey: null,
    todayKey: "2026-09-19",
  };
  it("sends at the chosen hour", () => {
    expect(shouldSendPracticeReminder(base)).toBe(true);
  });
  it("uses the default hour when unset", () => {
    expect(
      shouldSendPracticeReminder({ ...base, reminderHour: null, localHour: DEFAULT_REMINDER_HOUR }),
    ).toBe(true);
    expect(shouldSendPracticeReminder({ ...base, reminderHour: null, localHour: 7 })).toBe(false);
  });
  it.each([
    ["disabled", { enabled: false }],
    ["wrong hour", { localHour: 9 }],
    ["already practiced", { practicedToday: true }],
    ["already reminded today", { lastReminderDateKey: "2026-09-19" }],
  ])("does not send when %s", (_label, patch) => {
    expect(shouldSendPracticeReminder({ ...base, ...patch })).toBe(false);
  });
  it("sends again on a later day", () => {
    expect(shouldSendPracticeReminder({ ...base, lastReminderDateKey: "2026-09-18" })).toBe(true);
  });
});

describe("shouldSendWeeklySummary", () => {
  const base = {
    enabled: true,
    localHour: 9,
    localWeekday: 1,
    lastSummaryDateKey: null,
    todayKey: "2026-09-21",
  };
  it("sends Monday morning", () => {
    expect(shouldSendWeeklySummary(base)).toBe(true);
  });
  it.each([
    ["disabled", { enabled: false }],
    ["not Monday", { localWeekday: 3 }],
    ["wrong hour", { localHour: 20 }],
    ["already sent", { lastSummaryDateKey: "2026-09-21" }],
  ])("does not send when %s", (_label, patch) => {
    expect(shouldSendWeeklySummary({ ...base, ...patch })).toBe(false);
  });
});

describe("email templates", () => {
  it("escapes user-provided values", () => {
    expect(escapeHtml(`<script>"x"&'y'`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;");
    const mail = practiceReminderEmail({ to: "a@b.co", name: "<b>Ada</b>", streak: 3 });
    expect(mail.html).not.toContain("<b>Ada</b>");
    expect(mail.html).toContain("&lt;b&gt;Ada&lt;/b&gt;");
  });

  it("varies the reminder by streak and always includes text + html", () => {
    const withStreak = practiceReminderEmail({ to: "a@b.co", name: "Ada", streak: 5 });
    expect(withStreak.subject).toMatch(/5-day streak/);
    expect(withStreak.text).toContain("/practice");
    expect(withStreak.html).toContain("<html");
    const noStreak = practiceReminderEmail({ to: "a@b.co", name: "Ada", streak: 0 });
    expect(noStreak.subject).not.toMatch(/streak/);
  });

  it("renders the weekly summary with missing metrics as dashes", () => {
    const mail = weeklySummaryEmail({
      to: "a@b.co",
      name: "Ada",
      sessions: 0,
      averageScore: null,
      fillerPerMinute: null,
      streak: 0,
    });
    expect(mail.subject).toContain("0 sessions");
    expect(mail.html).toContain("—");
    expect(mail.html).toContain("/settings");
  });
});
