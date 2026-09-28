import { TOPIC_BANK } from "./topic-bank";
import { pickTopic, RECENT_WINDOW } from "./select";

const c = (...ids: string[]) => ids.map((id) => ({ id }));

describe("pickTopic", () => {
  it("returns null for no candidates", () => {
    expect(pickTopic([], [])).toBeNull();
  });

  it("returns the only candidate even if recent", () => {
    expect(pickTopic(c("a"), ["a"])?.id).toBe("a");
  });

  it("never picks a recently shown topic when fresh ones exist", () => {
    const candidates = c("a", "b", "c", "d");
    for (let i = 0; i < 50; i++) {
      const picked = pickTopic(candidates, ["a", "b", "c"], Math.random);
      expect(picked?.id).toBe("d");
    }
  });

  it("uses the RNG to choose among fresh candidates", () => {
    const candidates = c("a", "b", "c");
    expect(pickTopic(candidates, [], () => 0)?.id).toBe("a");
    expect(pickTopic(candidates, [], () => 0.5)?.id).toBe("b");
    expect(pickTopic(candidates, [], () => 0.999)?.id).toBe("c");
  });

  it("is safe if the RNG returns exactly 1", () => {
    expect(pickTopic(c("a", "b"), [], () => 1)).not.toBeNull();
  });

  it("falls back to the least recently shown when all are recent", () => {
    // most recent first: c was shown most recently, a longest ago
    expect(pickTopic(c("a", "b", "c"), ["c", "b", "a"])?.id).toBe("a");
  });

  it("prefers never-shown candidates over the recent window's tail", () => {
    const recent = Array.from({ length: RECENT_WINDOW + 5 }, (_, i) => `r${i}`);
    // r44 is outside the window, so it counts as fresh.
    expect(pickTopic(c("r0", `r${RECENT_WINDOW + 4}`), recent, () => 0)?.id).toBe(
      `r${RECENT_WINDOW + 4}`,
    );
  });

  it("produces a roughly uniform distribution", () => {
    const candidates = c("a", "b", "c", "d");
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const id = pickTopic(candidates, [])!.id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(800);
  });
});

describe("topic bank", () => {
  it("has unique topics", () => {
    const texts = TOPIC_BANK.map((t) => t.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("covers every category at every difficulty", () => {
    const combos = new Set(TOPIC_BANK.map((t) => `${t.category}:${t.difficulty}`));
    expect(combos.size).toBe(15 * 3);
  });

  it("keeps prompts concise", () => {
    for (const t of TOPIC_BANK) expect(t.text.length).toBeLessThanOrEqual(120);
  });
});
