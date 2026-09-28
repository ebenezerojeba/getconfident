import { NextResponse } from "next/server";

import { withUser } from "@/lib/api";
import { db } from "@/lib/db/client";
import { RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Exports everything the app stores about the user as JSON (GDPR-style
 * portability). Secrets (password hash, session tokens) are never included.
 */
export const GET = withUser(
  async (_req, { user }) => {
    const [profile, sessions, achievements, notifications, topicHistory] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          goal: true,
          timezone: true,
          onboardedAt: true,
          createdAt: true,
          preferences: true,
        },
      }),
      db.practiceSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        include: {
          transcript: true,
          analysis: true,
          followUps: { orderBy: { order: "asc" } },
          recording: {
            select: {
              kind: true,
              mimeType: true,
              sizeBytes: true,
              durationMs: true,
              createdAt: true,
            },
          },
        },
      }),
      db.userAchievement.findMany({ where: { userId: user.id }, include: { achievement: true } }),
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      db.topicHistory.findMany({
        where: { userId: user.id },
        orderBy: { shownAt: "asc" },
        include: { topic: { select: { text: true, category: true, difficulty: true } } },
      }),
    ]);

    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        note: "Recordings are binary files and are not included in this export.",
        profile,
        sessions,
        achievements,
        notifications,
        topicHistory,
      },
      null,
      2,
    );

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="comm-coach-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
  { rateLimit: { name: "account-export", rule: RATE_LIMITS.passwordChange } },
);
