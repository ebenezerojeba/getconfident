import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { PracticeMode, TopicCategory } from "@/generated/prisma/enums";
import { db } from "@/lib/db/client";

export const HISTORY_PAGE_SIZE = 10;

export const historyQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  mode: z.enum(PracticeMode).optional().catch(undefined),
  category: z.enum(TopicCategory).optional().catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(1).default(1),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

/** Paged, filtered history of the user's sessions (ownership enforced in the where clause). */
export async function getHistory(userId: string, query: HistoryQuery) {
  const where: Prisma.PracticeSessionWhereInput = {
    userId,
    status: { notIn: ["CANCELLED", "DRAFT", "READY", "COUNTDOWN", "RECORDING"] },
    ...(query.q ? { topicText: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.mode ? { mode: query.mode } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
            ...(query.to
              ? { lt: new Date(new Date(`${query.to}T00:00:00Z`).getTime() + 86_400_000) }
              : {}),
          },
        }
      : {}),
  };
  const [total, sessions] = await Promise.all([
    db.practiceSession.count({ where }),
    db.practiceSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
      select: {
        id: true,
        topicText: true,
        mode: true,
        status: true,
        createdAt: true,
        analysis: { select: { overallScore: true } },
      },
    }),
  ]);
  return { total, sessions, pages: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)) };
}
