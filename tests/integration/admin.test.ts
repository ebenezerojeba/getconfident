import { getAdminOverview, getAdminUsers } from "@/features/admin/service";
import { db } from "@/lib/db/client";

import { createTestUser, uid } from "../support/factories";

const DAY = 24 * 60 * 60 * 1000;

async function completedSession(userId: string, daysAgo: number, score: number) {
  const at = new Date(Date.now() - daysAgo * DAY);
  return db.practiceSession.create({
    data: {
      userId,
      topicText: "Admin metrics test topic",
      mode: "INTERVIEW",
      targetDurationSec: 60,
      status: "COMPLETED",
      startedAt: at,
      completedAt: at,
      createdAt: at,
      analysis: {
        create: {
          overallScore: score,
          confidenceScore: score,
          grammarScore: score,
          clarityScore: score,
          wordCount: 100,
          fillerCount: 2,
          fillerPerMinute: 2,
          longPauseCount: 0,
          report: {},
          fillerAnalysis: {},
          provider: "mock",
          model: "mock",
        },
      },
    },
  });
}

describe("admin metrics", () => {
  it("counts sign-ups, practising users, returning users and sessions", async () => {
    const before = await getAdminOverview();

    const returning = await createTestUser({ name: uid("Returning") });
    const once = await createTestUser({ name: uid("Once") });
    await createTestUser({ name: uid("Never") }); // signed up, never practised
    await completedSession(returning.id, 0, 80);
    await completedSession(returning.id, 2, 70); // a different day → "returning"
    await completedSession(once.id, 0, 60);

    const after = await getAdminOverview();
    expect(after.totals.users - before.totals.users).toBe(3);
    expect(after.totals.users7d - before.totals.users7d).toBe(3);
    expect(after.totals.activated - before.totals.activated).toBe(2);
    expect(after.totals.weeklyActive - before.totals.weeklyActive).toBe(2);
    expect(after.totals.sessions - before.totals.sessions).toBe(3);

    const step = (o: typeof after, name: string) => o.funnel.find((f) => f.step === name)!.count;
    expect(step(after, "Practised on 2+ days") - step(before, "Practised on 2+ days")).toBe(1);

    // 30 daily buckets, today last, and today's sessions include ours.
    expect(after.daily).toHaveLength(30);
    const today = (o: typeof after) => o.daily[o.daily.length - 1];
    expect(today(after).sessions - today(before).sessions).toBe(2);
    expect(after.quality.length).toBeGreaterThan(0);
  });

  it("lists users newest first with session counts, and searches by name or email", async () => {
    const name = uid("Searchable");
    const user = await createTestUser({ name });
    await completedSession(user.id, 0, 75);

    const byName = await getAdminUsers(1, name);
    expect(byName.total).toBe(1);
    expect(byName.users[0]).toMatchObject({ email: user.email, sessions: 1 });
    expect(byName.users[0].lastPractised).not.toBeNull();

    const byEmail = await getAdminUsers(1, user.email.toUpperCase());
    expect(byEmail.users.map((u) => u.id)).toEqual([user.id]);

    const newest = await getAdminUsers(1);
    expect(newest.users[0].id).toBe(user.id);
  });
});
