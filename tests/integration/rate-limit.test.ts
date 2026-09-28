import { db } from "@/lib/db/client";
import { consumeRateLimit, enforceRateLimit, resetRateLimit } from "@/lib/rate-limit";

import { uid } from "../support/factories";

describe("rate limiting (postgres fixed window)", () => {
  const rule = { limit: 3, windowMs: 60_000 };

  it("allows up to the limit then blocks", async () => {
    const key = uid("test:basic");
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await consumeRateLimit(key, rule));
    expect(results.map((r) => r.success)).toEqual([true, true, true, false, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[4].retryAfterSec).toBeGreaterThan(0);
  });

  it("is atomic under concurrency", async () => {
    const key = uid("test:concurrent");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit(key, rule)),
    );
    expect(results.filter((r) => r.success)).toHaveLength(3);
  });

  it("starts a fresh window after expiry", async () => {
    const key = uid("test:expiry");
    for (let i = 0; i < 4; i++) await consumeRateLimit(key, rule);
    await db.rateLimitBucket.update({
      where: { key },
      data: { resetAt: new Date(Date.now() - 1) },
    });
    const r = await consumeRateLimit(key, rule);
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("enforceRateLimit throws a RATE_LIMIT error and reset clears it", async () => {
    const key = uid("test:enforce");
    for (let i = 0; i < 3; i++) await enforceRateLimit(key, rule);
    await expect(enforceRateLimit(key, rule)).rejects.toMatchObject({ code: "RATE_LIMIT" });
    await resetRateLimit(key);
    await expect(enforceRateLimit(key, rule)).resolves.toBeUndefined();
  });
});
