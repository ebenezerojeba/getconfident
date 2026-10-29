import { dailySessionsRemaining } from "@/features/practice/daily-limit";
import { createPracticeSession, saveRecording } from "@/features/practice/service";
import { getRandomTopic } from "@/features/topics/service";

import { createTestUser, ensureSeedData } from "../support/factories";

const webm = () => {
  const b = new Uint8Array(1024);
  b.set([0x1a, 0x45, 0xdf, 0xa3]);
  return b;
};

beforeAll(async () => {
  await ensureSeedData();
});

describe("daily session limit", () => {
  const original = process.env.DAILY_SESSION_LIMIT;
  beforeEach(() => {
    process.env.DAILY_SESSION_LIMIT = "2";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.DAILY_SESSION_LIMIT;
    else process.env.DAILY_SESSION_LIMIT = original;
  });

  it("counts submitted recordings and blocks new sessions at the limit", async () => {
    const user = await createTestUser();
    const start = async () => {
      const topic = await getRandomTopic(user.id, { difficulty: "EASY" });
      return createPracticeSession(user.id, {
        topicId: topic.id,
        mode: "IMPROMPTU",
        difficulty: "EASY",
        targetDurationSec: 60,
        withVideo: false,
      });
    };
    const submit = (id: string) =>
      saveRecording(user.id, id, {
        kind: "AUDIO",
        media: { bytes: webm(), mimeType: "audio/webm" },
        durationMs: 1000,
        elapsedSec: 1,
      });

    expect(await dailySessionsRemaining(user.id)).toMatchObject({ limit: 2, remaining: 2 });
    const a = await start();
    const b = await start();
    await submit(a.id);
    expect((await dailySessionsRemaining(user.id)).remaining).toBe(1);
    await submit(b.id);
    expect((await dailySessionsRemaining(user.id)).remaining).toBe(0);

    await expect(start()).rejects.toMatchObject({ code: "RATE_LIMIT" });
  });

  it("rejects a recording once the allowance is used up", async () => {
    const user = await createTestUser();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const topic = await getRandomTopic(user.id, { difficulty: "EASY" });
      ids.push(
        (
          await createPracticeSession(user.id, {
            topicId: topic.id,
            mode: "IMPROMPTU",
            difficulty: "EASY",
            targetDurationSec: 60,
            withVideo: false,
          })
        ).id,
      );
    }
    const submit = (id: string) =>
      saveRecording(user.id, id, {
        kind: "AUDIO",
        media: { bytes: webm(), mimeType: "audio/webm" },
        durationMs: 1000,
        elapsedSec: 1,
      });
    await submit(ids[0]);
    await submit(ids[1]);
    await expect(submit(ids[2])).rejects.toMatchObject({ code: "RATE_LIMIT" });
  });
});
