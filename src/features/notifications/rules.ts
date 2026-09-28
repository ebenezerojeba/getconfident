/** Pure scheduling rules for reminder / summary emails (time-zone aware). */

export type LocalTime = { hour: number; weekday: number; dateKey: string };

/** Local hour (0-23), ISO weekday (1=Mon..7=Sun) and date key for an instant. */
export function localTimeIn(timeZone: string, now: Date): LocalTime {
  const fmt = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(now);
    } catch {
      return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(now);
    }
  };
  const hour = Number(fmt({ hour: "2-digit", hour12: false }));
  const weekdayName = fmt({ weekday: "short" });
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekday = order.indexOf(weekdayName) + 1;
  const [d, m, y] = fmt({ day: "2-digit", month: "2-digit", year: "numeric" }).split("/");
  return {
    hour: Number.isNaN(hour) ? 0 : hour % 24,
    weekday: weekday || 1,
    dateKey: `${y}-${m}-${d}`,
  };
}

export const DEFAULT_REMINDER_HOUR = 18;
export const WEEKLY_SUMMARY_WEEKDAY = 1; // Monday
export const WEEKLY_SUMMARY_HOUR = 9;

export function shouldSendPracticeReminder(input: {
  enabled: boolean;
  reminderHour: number | null;
  localHour: number;
  practicedToday: boolean;
  lastReminderDateKey: string | null;
  todayKey: string;
}): boolean {
  if (!input.enabled) return false;
  if (input.practicedToday) return false;
  if (input.lastReminderDateKey === input.todayKey) return false; // at most once a day
  return input.localHour === (input.reminderHour ?? DEFAULT_REMINDER_HOUR);
}

export function shouldSendWeeklySummary(input: {
  enabled: boolean;
  localHour: number;
  localWeekday: number;
  lastSummaryDateKey: string | null;
  todayKey: string;
}): boolean {
  if (!input.enabled) return false;
  if (input.lastSummaryDateKey === input.todayKey) return false;
  return input.localWeekday === WEEKLY_SUMMARY_WEEKDAY && input.localHour === WEEKLY_SUMMARY_HOUR;
}
