import { describe, expect, it } from "vitest";

import type { SessionPoint } from "./analytics";
import { computeJourney } from "./journey";

const point = (day: number, score: number, filler: number, confidence = score): SessionPoint => ({
  id: `s${day}`,
  completedAt: new Date(Date.UTC(2026, 9, day)),
  mode: "IMPROMPTU",
  overallScore: score,
  confidenceScore: confidence,
  grammarScore: 70,
  fillerPerMinute: filler,
  wordsPerMinute: 140,
  elapsedSec: 60,
});

describe("computeJourney", () => {
  it("is empty without sessions", () => {
    expect(computeJourney([])).toBeNull();
  });

  it("sets a starting score after the first session", () => {
    const j = computeJourney([point(1, 58, 6)])!;
    expect(j.start.score).toBe(58);
    expect(j.now).toBeNull();
    expect(j.highlight).toMatch(/starting score is 58/);
  });

  it("compares day one with the average of the latest sessions", () => {
    const j = computeJourney([
      point(5, 70, 3), // out of order on purpose
      point(1, 58, 6),
      point(3, 64, 4),
      point(4, 66, 3),
      point(6, 72, 2),
    ])!;
    expect(j.start.score).toBe(58); // earliest session, not the first in the array
    expect(j.sessionsSince).toBe(4);
    expect(j.now?.score).toBe(69); // avg of 66, 70, 72
    expect(j.scoreDelta).toBe(11);
    expect(j.fillerReductionPct).toBe(55); // 6 → 2.7 per minute
    expect(j.highlight).toMatch(/55% fewer filler words/);
  });

  it("celebrates score gains when fillers were already low", () => {
    const j = computeJourney([point(1, 60, 0), point(2, 66, 0)])!;
    expect(j.fillerReductionPct).toBeNull();
    expect(j.highlight).toMatch(/up 6 points/);
  });
});
