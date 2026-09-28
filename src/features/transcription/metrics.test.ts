import {
  computeSpeechMetrics,
  countWords,
  detectLongPauses,
  detectRepetitions,
  scorePace,
  scorePauses,
} from "./metrics";

describe("countWords", () => {
  it("counts words including contractions", () => {
    expect(countWords("I don't think it's 5 o'clock.")).toBe(6);
    expect(countWords("   ")).toBe(0);
  });
});

describe("detectLongPauses", () => {
  it("uses word gaps when available", () => {
    const pauses = detectLongPauses({
      segments: [],
      words: [
        { word: "a", start: 0, end: 0.5 },
        { word: "b", start: 0.7, end: 1 },
        { word: "c", start: 3.5, end: 4 },
      ],
    });
    expect(pauses).toEqual([{ start: 1, end: 3.5, duration: 2.5 }]);
  });

  it("falls back to segment gaps", () => {
    const pauses = detectLongPauses({
      words: null,
      segments: [
        { start: 0, end: 3, text: "one" },
        { start: 6, end: 9, text: "two" },
        { start: 9.5, end: 10, text: "three" },
      ],
    });
    expect(pauses).toHaveLength(1);
    expect(pauses[0].duration).toBe(3);
  });

  it("ignores gaps shorter than 2 seconds", () => {
    expect(
      detectLongPauses({
        words: null,
        segments: [
          { start: 0, end: 1, text: "x" },
          { start: 2.9, end: 3, text: "y" },
        ],
      }),
    ).toEqual([]);
  });
});

describe("detectRepetitions", () => {
  it("finds stutters and multi-repeats", () => {
    expect(detectRepetitions("I I think the the the plan works")).toEqual([
      { word: "i", wordIndex: 0, count: 2 },
      { word: "the", wordIndex: 3, count: 3 },
    ]);
  });
  it("ignores repeated numbers and normal text", () => {
    expect(detectRepetitions("It cost 5 5 dollars and we left.")).toEqual([]);
  });
});

describe("scoring", () => {
  it("scores pace with a comfortable band", () => {
    expect(scorePace(145)).toBe(100);
    expect(scorePace(100)).toBe(58);
    expect(scorePace(220)).toBe(16);
    expect(scorePace(null)).toBeNull();
  });
  it("scores pauses", () => {
    expect(scorePauses([], 60)).toBe(100);
    expect(scorePauses([{ start: 0, end: 5, duration: 5 }], 60)).toBe(78);
    expect(scorePauses([], null)).toBeNull();
  });
});

describe("computeSpeechMetrics", () => {
  it("computes wpm from transcript duration", () => {
    const text = Array.from({ length: 150 }, () => "word").join(" ");
    const m = computeSpeechMetrics({
      text,
      language: "en",
      durationSec: 60,
      segments: [{ start: 0, end: 60, text }],
      words: null,
    });
    expect(m.wordCount).toBe(150);
    expect(m.wordsPerMinute).toBe(150);
    expect(m.paceScore).toBe(100);
    // Single segment: no timing granularity for pauses.
    expect(m.pauseScore).toBeNull();
  });

  it("uses fallback duration and guards tiny durations", () => {
    const base = { language: null, segments: [], words: null, durationSec: null };
    expect(computeSpeechMetrics({ ...base, text: "hi there" }, 60).wordsPerMinute).toBe(2);
    expect(computeSpeechMetrics({ ...base, text: "hi there" }, 2).wordsPerMinute).toBeNull();
    expect(computeSpeechMetrics({ ...base, text: "" }, 60).wordsPerMinute).toBeNull();
  });
});
