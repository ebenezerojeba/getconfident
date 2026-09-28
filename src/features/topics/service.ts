import "server-only";

import { createHash } from "node:crypto";

import { getMode } from "@/config/practice-modes";
import type { Difficulty, PracticeMode, Topic, TopicCategory } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";

import { pickTopic, RECENT_WINDOW } from "./select";

export type TopicFilters = {
  category?: TopicCategory | null;
  difficulty?: Difficulty | null;
  mode?: PracticeMode | null;
  /** Topic the user is skipping ("Generate another"). */
  skipTopicId?: string | null;
};

export type PublicTopic = Pick<Topic, "id" | "text" | "category" | "difficulty">;

const topicSelect = { id: true, text: true, category: true, difficulty: true } as const;

async function resolveCategories(userId: string, f: TopicFilters): Promise<TopicCategory[]> {
  if (f.category) return [f.category];
  if (f.mode) {
    const cats = getMode(f.mode).promptCategories;
    if (cats.length) return cats;
  }
  const prefs = await db.userPreferences.findUnique({
    where: { userId },
    select: { preferredCategories: true },
  });
  return prefs?.preferredCategories ?? [];
}

/**
 * Picks a random topic for the user and records it in their topic history.
 * Filters narrow from explicit choice → mode categories → user preferences;
 * if the difficulty filter leaves nothing, it is relaxed rather than failing.
 */
export async function getRandomTopic(userId: string, filters: TopicFilters): Promise<PublicTopic> {
  const categories = await resolveCategories(userId, filters);
  const categoryWhere = categories.length ? { category: { in: categories } } : {};

  let candidates = await db.topic.findMany({
    where: {
      isActive: true,
      ...categoryWhere,
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    },
    select: topicSelect,
  });
  if (!candidates.length && filters.difficulty) {
    candidates = await db.topic.findMany({
      where: { isActive: true, ...categoryWhere },
      select: topicSelect,
    });
  }
  if (!candidates.length) {
    throw new AppError("NOT_FOUND", "No topics are available for those filters yet.");
  }

  const recent = await db.topicHistory.findMany({
    where: { userId },
    orderBy: { shownAt: "desc" },
    take: RECENT_WINDOW,
    select: { topicId: true },
  });
  const recentIds = recent.map((r) => r.topicId);
  // Never immediately repeat the topic being skipped.
  if (filters.skipTopicId && !recentIds.includes(filters.skipTopicId)) {
    recentIds.unshift(filters.skipTopicId);
  }

  const topic = pickTopic(candidates, recentIds);
  if (!topic) throw new AppError("NOT_FOUND", "No topics are available for those filters yet.");

  await db.$transaction(async (tx) => {
    if (filters.skipTopicId) {
      const last = await tx.topicHistory.findFirst({
        where: { userId, topicId: filters.skipTopicId },
        orderBy: { shownAt: "desc" },
        select: { id: true },
      });
      if (last) await tx.topicHistory.update({ where: { id: last.id }, data: { skipped: true } });
    }
    await tx.topicHistory.create({ data: { userId, topicId: topic.id } });
  });

  return topic;
}

export async function getTopicHistory(userId: string, take = 20) {
  return db.topicHistory.findMany({
    where: { userId },
    orderBy: { shownAt: "desc" },
    take,
    select: { id: true, shownAt: true, skipped: true, topic: { select: topicSelect } },
  });
}

/** Calendar date (YYYY-MM-DD) in the given IANA time zone. */
export function localDateKey(date: Date, timeZone: string): string {
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

/** Same prompt for everyone on a given local date; stable across requests. */
export async function getDailyChallenge(
  timeZone: string,
  now = new Date(),
): Promise<PublicTopic | null> {
  const pool = await db.topic.findMany({
    where: { isActive: true, difficulty: "MEDIUM" },
    orderBy: { text: "asc" },
    select: topicSelect,
  });
  if (!pool.length) return null;
  const key = localDateKey(now, timeZone);
  const hash = createHash("sha256").update(`daily:${key}`).digest();
  return pool[hash.readUInt32BE(0) % pool.length];
}
