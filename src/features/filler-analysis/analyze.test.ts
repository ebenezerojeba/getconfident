import { analyzeFillers, type Filler, tokenize } from "./analyze";

const fillersIn = (text: string) => analyzeFillers(text).occurrences.map((o) => o.filler);
const count = (text: string, f: Filler) => fillersIn(text).filter((x) => x === f).length;

describe("tokenize", () => {
  it("captures punctuation around words", () => {
    const t = tokenize("Well, I think. So yes");
    expect(t.map((x) => x.word)).toEqual(["well", "i", "think", "so", "yes"]);
    expect(t[0].after).toBe(",");
    expect(t[3].before).toBe(".");
  });

  it("keeps contractions together", () => {
    expect(tokenize("I don't know, it's fine").map((t) => t.word)).toEqual([
      "i",
      "don't",
      "know",
      "it's",
      "fine",
    ]);
  });
});

describe("um / uh", () => {
  it("counts hesitation sounds and their spelling variants", () => {
    expect(fillersIn("Um, I think, uh, it's umm fine. Uhh. Erm, yes. Hmm.")).toEqual([
      "um",
      "uh",
      "um",
      "uh",
      "uh",
      "um",
    ]);
  });
  it("does not match words containing those letters", () => {
    expect(fillersIn("The umbrella was huge and the human laughed. Uhuru park.")).toEqual([]);
  });
});

describe("like", () => {
  it.each([
    "I like pizza.",
    "Would you like some tea?",
    "It looks like rain.",
    "I feel like we should go.",
    "People like you inspire me.",
    "Things like that matter.",
    "I don't like mornings.",
    "Just like my dad used to say.",
  ])("not a filler: %s", (text) => {
    expect(count(text, "like")).toBe(0);
  });

  it.each([
    ["It was, like, huge.", 1],
    ["Like, I don't know what happened.", 1],
    ["We waited like 20 minutes.", 1],
    ["And then, like, everyone left, like, immediately.", 2],
  ])("filler: %s", (text, n) => {
    expect(count(text, "like")).toBe(n);
  });
});

describe("you know", () => {
  it.each([
    "Do you know the way?",
    "You know that I care.",
    "If you know how, tell me.",
    "Did you know about it?",
    "As you know the answer already, skip it.",
  ])("not a filler: %s", (text) => {
    expect(count(text, "you know")).toBe(0);
  });

  it.each([
    "It was, you know, complicated.",
    "I went there, you know.",
    "You know, I never thought about it.",
    "It's hard you know I really tried.",
  ])("filler: %s", (text) => {
    expect(count(text, "you know")).toBe(1);
  });
});

describe("kind of / sort of", () => {
  it.each([
    "What kind of music do you like?",
    "That sort of thing happens.",
    "This kind of problem is common.",
    "A different sort of approach.",
  ])("not a filler: %s", (text) => {
    expect(fillersIn(text)).toEqual([]);
  });
  it("counts hedging uses", () => {
    expect(fillersIn("It was kind of hard and sort of boring.")).toEqual(["kind of", "sort of"]);
  });
});

describe("so", () => {
  it.each([
    "I was so tired.",
    "I study so that I can learn.",
    "Thank you so much.",
    "I think so.",
    "It rained, and so on.",
  ])("not a filler: %s", (text) => {
    expect(count(text, "so")).toBe(0);
  });
  it("counts sentence-initial so", () => {
    expect(count("So, I started a company. So the first year was hard.", "so")).toBe(2);
  });
});

describe("basically / actually / literally", () => {
  it("always counts basically", () => {
    expect(count("It basically works. Basically, yes.", "basically")).toBe(2);
  });
  it("counts actually only when set off or sentence-initial", () => {
    expect(count("What actually happened was odd.", "actually")).toBe(0);
    expect(count("Actually, I disagree.", "actually")).toBe(1);
    expect(count("It was, actually, fine.", "actually")).toBe(1);
  });
  it("does not count definitional literally", () => {
    expect(count("The word literally means exactly.", "literally")).toBe(0);
    expect(count("I literally died laughing.", "literally")).toBe(1);
  });
});

describe("analyzeFillers metrics", () => {
  it("computes totals, percentage and per-minute", () => {
    const text = "Um, so, I think it was, like, basically fine. You know, it worked.";
    const a = analyzeFillers(text, { durationSec: 30 });
    expect(a.totalWords).toBe(13);
    expect(a.totalFillers).toBe(5);
    expect(a.fillerPercent).toBeCloseTo((5 / 13) * 100, 0);
    expect(a.perMinute).toBe(10);
    expect(a.byFiller.reduce((s, f) => s + f.count, 0)).toBe(5);
    expect(a.byFiller.every((f) => f.perMinute !== null)).toBe(true);
  });

  it("returns null rates when duration is unknown", () => {
    const a = analyzeFillers("Um hello");
    expect(a.perMinute).toBeNull();
    expect(a.byFiller[0].perMinute).toBeNull();
  });

  it("handles empty transcripts", () => {
    const a = analyzeFillers("", { durationSec: 10 });
    expect(a.totalWords).toBe(0);
    expect(a.totalFillers).toBe(0);
    expect(a.fillerPercent).toBe(0);
    expect(a.suggestions[0]).toMatch(/No filler words/);
  });

  it("builds a timeline from word timestamps", () => {
    const text = "Hello, um, everyone. So, like, welcome.";
    const words = [
      { word: "Hello", start: 0, end: 0.4 },
      { word: "um", start: 0.6, end: 0.8 },
      { word: "everyone", start: 1, end: 1.5 },
      { word: "So", start: 2, end: 2.2 },
      { word: "like", start: 2.4, end: 2.6 },
      { word: "welcome", start: 2.8, end: 3.2 },
    ];
    const a = analyzeFillers(text, { durationSec: 3.2, words });
    expect(a.hasTimeline).toBe(true);
    expect(a.occurrences.map((o) => [o.filler, o.time])).toEqual([
      ["um", 0.6],
      ["so", 2],
      ["like", 2.4],
    ]);
  });

  it("suggests targeted tips for the most frequent fillers", () => {
    const a = analyzeFillers("Um, um, um, like, it's fine.", { durationSec: 20 });
    expect(a.suggestions[0]).toMatch(/um/);
    expect(a.suggestions.some((s) => /filler rate is high/.test(s))).toBe(true);
  });
});
