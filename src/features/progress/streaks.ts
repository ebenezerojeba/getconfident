/** Calendar date (YYYY-MM-DD) of an instant in an IANA time zone. */
export function dateKeyInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

const DAY_MS = 86_400_000;
const toDayNumber = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

export type StreakResult = {
  current: number;
  longest: number;
  /** Whether the user has already practiced today (in their time zone). */
  practicedToday: boolean;
};

/**
 * Computes streaks from the local dates of completed sessions. The current
 * streak stays alive until the end of the day after the last practice.
 */
export function computeStreaks(dateKeys: string[], todayKey: string): StreakResult {
  const days = [...new Set(dateKeys)].map(toDayNumber).sort((a, b) => a - b);
  if (!days.length) return { current: 0, longest: 0, practicedToday: false };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = toDayNumber(todayKey);
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || last === today - 1) {
    current = 1;
    for (let i = days.length - 1; i > 0 && days[i] === days[i - 1] + 1; i--) current++;
  }
  return { current, longest, practicedToday: last === today };
}
