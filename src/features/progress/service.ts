import "server-only";

import { db } from "@/lib/db/client";

import { computeProgress, type RangeKey, rangeStart, type SessionPoint } from "./analytics";

/** Loads completed sessions for the user (optionally within a range) and computes progress. */
export async function getProgress(
  userId: string,
  timeZone: string,
  range: RangeKey = "all",
  now = new Date(),
) {
  const since = rangeStart(range, now);
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
  const points: SessionPoint[] = rows.map((r) => ({
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
  return computeProgress(points, timeZone, now);
}

export async function getRecentSessions(userId: string, take = 5) {
  return db.practiceSession.findMany({
    where: { userId, status: { notIn: ["CANCELLED", "DRAFT", "READY"] } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      topicText: true,
      mode: true,
      status: true,
      createdAt: true,
      analysis: { select: { overallScore: true } },
    },
  });
}
