import "server-only";

import { dailySessionRule } from "@/features/practice/daily-limit";
import { db } from "@/lib/db/client";

/**
 * Read-only business metrics for the admin dashboard. Aggregates only: no
 * recordings or transcripts are ever read here. Days are bucketed in Lagos time.
 */
const TZ = "Africa/Lagos";
const DAY = 24 * 60 * 60 * 1000;
const n = (v: unknown) => Number(v ?? 0);

export type DailyRow = { day: string; signups: number; sessions: number; activeUsers: number };

async function totals() {
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY);
  const completed = { status: "COMPLETED" as const };
  const [users, users7d, users30d, onboarded, sessions, sessions7d, activated, wau, mau] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: since(7) } } }),
      db.user.count({ where: { createdAt: { gte: since(30) } } }),
      db.user.count({ where: { onboardedAt: { not: null } } }),
      db.practiceSession.count({ where: completed }),
      db.practiceSession.count({ where: { ...completed, completedAt: { gte: since(7) } } }),
      db.practiceSession.findMany({
        where: completed,
        distinct: ["userId"],
        select: { userId: true },
      }),
      db.practiceSession.findMany({
        where: { ...completed, completedAt: { gte: since(7) } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      db.practiceSession.findMany({
        where: { ...completed, completedAt: { gte: since(30) } },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);
  return {
    users,
    users7d,
    users30d,
    onboarded,
    sessions,
    sessions7d,
    activated: activated.length,
    weeklyActive: wau.length,
    monthlyActive: mau.length,
  };
}

/** Users who practised on at least two different (Lagos) days. */
async function returningUsers(): Promise<number> {
  const rows = await db.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM (
      SELECT "userId"
      FROM "PracticeSession"
      WHERE status = 'COMPLETED'
      GROUP BY "userId"
      HAVING count(DISTINCT ("completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date) >= 2
    ) t`;
  return n(rows[0]?.count);
}

async function daily(days = 30): Promise<DailyRow[]> {
  const rows = await db.$queryRaw<
    { day: Date; signups: bigint; sessions: bigint; active_users: bigint }[]
  >`
    WITH days AS (
      SELECT generate_series(
        (now() AT TIME ZONE ${TZ})::date - ${days - 1}::int,
        (now() AT TIME ZONE ${TZ})::date,
        interval '1 day'
      )::date AS day
    ),
    s AS (
      SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date AS day, count(*) AS c
      FROM "User" GROUP BY 1
    ),
    p AS (
      SELECT ("completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date AS day,
             count(*) AS c, count(DISTINCT "userId") AS u
      FROM "PracticeSession" WHERE status = 'COMPLETED' GROUP BY 1
    )
    SELECT days.day, coalesce(s.c, 0) AS signups, coalesce(p.c, 0) AS sessions,
           coalesce(p.u, 0) AS active_users
    FROM days LEFT JOIN s USING (day) LEFT JOIN p USING (day)
    ORDER BY days.day`;
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    signups: n(r.signups),
    sessions: n(r.sessions),
    activeUsers: n(r.active_users),
  }));
}

async function weeklyQuality(weeks = 8) {
  const rows = await db.$queryRaw<
    { week: Date; score: number | null; fillers: number | null; reports: bigint }[]
  >`
    SELECT date_trunc('week', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date AS week,
           avg("overallScore")::float AS score,
           avg("fillerPerMinute")::float AS fillers,
           count(*) AS reports
    FROM "SpeakingAnalysis"
    WHERE "createdAt" > now() - make_interval(weeks => ${weeks}::int)
    GROUP BY 1 ORDER BY 1`;
  return rows.map((r) => ({
    week: r.week.toISOString().slice(0, 10),
    score: r.score === null ? null : Math.round(r.score),
    fillers: r.fillers === null ? null : Math.round(r.fillers * 10) / 10,
    reports: n(r.reports),
  }));
}

async function health() {
  const since = new Date(Date.now() - 7 * DAY);
  const [statuses, failures, modes, today, capRows] = await Promise.all([
    db.practiceSession.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.practiceSession.findMany({
      where: { status: { in: ["PROCESSING_FAILED", "TRANSCRIPTION_FAILED", "ANALYSIS_FAILED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        failureReason: true,
        mode: true,
        updatedAt: true,
        user: { select: { email: true } },
      },
    }),
    db.practiceSession.groupBy({
      by: ["mode"],
      where: { status: "COMPLETED" },
      _count: { _all: true },
    }),
    db.practiceSession.count({ where: { startedAt: { gte: new Date(Date.now() - DAY) } } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM (
        SELECT "userId" FROM "PracticeSession"
        WHERE "startedAt" > now() - interval '24 hours'
        GROUP BY "userId" HAVING count(*) >= ${dailySessionRule().limit}::int
      ) t`,
  ]);
  return {
    statuses: statuses
      .map((s) => ({ status: s.status, count: s._count._all }))
      .sort((a, b) => b.count - a.count),
    failures: failures.map((f) => ({
      id: f.id,
      status: f.status,
      reason: f.failureReason,
      mode: f.mode,
      at: f.updatedAt.toISOString(),
      email: f.user.email,
    })),
    modes: modes
      .map((m) => ({ mode: m.mode, count: m._count._all }))
      .sort((a, b) => b.count - a.count),
    startedLast24h: today,
    usersAtDailyCap: n(capRows[0]?.count),
    dailyCap: dailySessionRule().limit,
  };
}

export async function getAdminOverview() {
  const [t, returning, days, quality, h] = await Promise.all([
    totals(),
    returningUsers(),
    daily(30),
    weeklyQuality(8),
    health(),
  ]);
  return {
    totals: t,
    funnel: [
      { step: "Signed up", count: t.users },
      { step: "Finished onboarding", count: t.onboarded },
      { step: "Completed a session", count: t.activated },
      { step: "Practised on 2+ days", count: returning },
    ],
    daily: days,
    quality,
    health: h,
  };
}

export const ADMIN_PAGE_SIZE = 25;

/** Newest users first, with practice counts and last activity. */
export async function getAdminUsers(page = 1, query = "") {
  const q = query.trim();
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        goal: true,
        createdAt: true,
        onboardedAt: true,
        _count: { select: { practiceSessions: { where: { status: "COMPLETED" } } } },
      },
    }),
  ]);
  const ids = users.map((u) => u.id);
  const [lastPractice, lastSeen] = await Promise.all([
    db.practiceSession.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: "COMPLETED" },
      _max: { completedAt: true },
    }),
    db.authSession.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _max: { lastSeenAt: true },
    }),
  ]);
  const practiced = new Map(lastPractice.map((r) => [r.userId, r._max.completedAt]));
  const seen = new Map(lastSeen.map((r) => [r.userId, r._max.lastSeenAt]));
  return {
    total,
    pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      goal: u.goal,
      joined: u.createdAt.toISOString(),
      onboarded: u.onboardedAt !== null,
      sessions: u._count.practiceSessions,
      lastPractised: practiced.get(u.id)?.toISOString() ?? null,
      lastSeen: seen.get(u.id)?.toISOString() ?? null,
    })),
  };
}
