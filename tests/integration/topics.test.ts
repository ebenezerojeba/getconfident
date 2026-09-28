import { getDailyChallenge, getRandomTopic, getTopicHistory } from "@/features/topics/service";
import { db } from "@/lib/db/client";

import { createTestUser, ensureSeedData } from "../support/factories";

beforeAll(async () => {
  await ensureSeedData();
});

describe("random topics", () => {
  it("respects category and difficulty filters", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      const t = await getRandomTopic(user.id, { category: "BUSINESS", difficulty: "HARD" });
      expect(t.category).toBe("BUSINESS");
      expect(t.difficulty).toBe("HARD");
    }
  });

  it("uses mode categories when no category is chosen", async () => {
    const user = await createTestUser();
    for (let i = 0; i < 5; i++) {
      const t = await getRandomTopic(user.id, { mode: "INTERVIEW" });
      expect(["JOB_INTERVIEW", "BEHAVIORAL"]).toContain(t.category);
    }
  });

  it("falls back to the user's preferred categories", async () => {
    const user = await createTestUser();
    await db.userPreferences.update({
      where: { userId: user.id },
      data: { preferredCategories: ["FUNNY"] },
    });
    const t = await getRandomTopic(user.id, {});
    expect(t.category).toBe("FUNNY");
  });

  it("avoids repeats until the filtered pool is exhausted", async () => {
    const user = await createTestUser();
    const pool = await db.topic.count({ where: { category: "DEBATE", difficulty: "EASY" } });
    const seen = new Set<string>();
    for (let i = 0; i < pool; i++) {
      seen.add((await getRandomTopic(user.id, { category: "DEBATE", difficulty: "EASY" })).id);
    }
    expect(seen.size).toBe(pool);
  });

  it("'generate another' marks the skipped topic and never repeats it immediately", async () => {
    const user = await createTestUser();
    const first = await getRandomTopic(user.id, { category: "SCHOOL", difficulty: "EASY" });
    const second = await getRandomTopic(user.id, {
      category: "SCHOOL",
      difficulty: "EASY",
      skipTopicId: first.id,
    });
    expect(second.id).not.toBe(first.id);
    const history = await getTopicHistory(user.id);
    expect(history[0].topic.id).toBe(second.id);
    expect(history[1]).toMatchObject({ skipped: true, topic: { id: first.id } });
  });

  it("keeps topic history per user", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await getRandomTopic(a.id, {});
    expect(await getTopicHistory(b.id)).toHaveLength(0);
    expect(await getTopicHistory(a.id)).toHaveLength(1);
  });
});

describe("daily challenge", () => {
  it("is stable for a date and changes across dates", async () => {
    const day1 = new Date("2026-09-19T12:00:00Z");
    const a = await getDailyChallenge("UTC", day1);
    const b = await getDailyChallenge("UTC", day1);
    expect(a?.id).toBe(b?.id);

    const ids = new Set<string | undefined>();
    for (let d = 0; d < 7; d++) {
      ids.add((await getDailyChallenge("UTC", new Date(day1.getTime() + d * 86_400_000)))?.id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it("uses the user's local date", async () => {
    // 02:00 UTC on the 20th is still the 19th in Los Angeles.
    const instant = new Date("2026-09-20T02:00:00Z");
    const la = await getDailyChallenge("America/Los_Angeles", instant);
    const utcPrevDay = await getDailyChallenge("UTC", new Date("2026-09-19T12:00:00Z"));
    expect(la?.id).toBe(utcPrevDay?.id);
  });
});
