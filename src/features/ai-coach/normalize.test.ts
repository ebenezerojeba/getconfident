import { analyzeFillers } from "@/features/filler-analysis/analyze";
import { MOCK_TRANSCRIPT_TEXT, mockTranscript } from "@/features/transcription/mock";
import { computeSpeechMetrics } from "@/features/transcription/metrics";

import { mockCoachReport } from "./mock-coach";
import { normalizeReport, scoreFillers } from "./normalize";
import type { AnalysisContext } from "./prompt";
import { coachReportSchema, type LlmReport } from "./schema";

const ctx: AnalysisContext = {
  topic: "Tell me about yourself.",
  category: "JOB_INTERVIEW",
  mode: "INTERVIEW",
  difficulty: "EASY",
  targetDurationSec: 60,
  elapsedSec: 55,
  withVideo: true,
};

function setup() {
  const transcript = mockTranscript(MOCK_TRANSCRIPT_TEXT);
  const speech = computeSpeechMetrics(transcript);
  const fillers = analyzeFillers(transcript.text, {
    durationSec: speech.durationSec,
    words: transcript.words,
  });
  const raw = mockCoachReport(transcript.text, ctx, speech, fillers);
  return { transcript, speech, fillers, raw };
}

describe("normalizeReport", () => {
  it("produces a report that satisfies the strict schema", () => {
    const { raw, speech, fillers } = setup();
    const report = normalizeReport(raw, { speech, fillers });
    expect(() => coachReportSchema.parse(report)).not.toThrow();
  });

  it("overrides measurable dimensions with deterministic values", () => {
    const { raw, speech, fillers } = setup();
    const tampered: LlmReport = structuredClone(raw);
    tampered.dimensions.fillerWords = { score: 100, basis: "observed", feedback: "Perfect!" };
    tampered.dimensions.pace = { score: 3, basis: "observed", feedback: "Too fast" };
    const report = normalizeReport(tampered, { speech, fillers });
    expect(report.dimensions.fillerWords.score).toBe(scoreFillers(fillers));
    expect(report.dimensions.fillerWords.feedback).toMatch(/filler words detected/);
    expect(report.dimensions.pace.score).toBe(speech.paceScore);
  });

  it("never reports eye contact, even if the model invents it", () => {
    const { raw, speech, fillers } = setup();
    const tampered: LlmReport = structuredClone(raw);
    tampered.toastmasters.eyeContact = {
      score: 95,
      basis: "observed",
      feedback: "Great eye contact",
    };
    const report = normalizeReport(tampered, { speech, fillers });
    expect(report.toastmasters.eyeContact.score).toBeNull();
    expect(report.toastmasters.eyeContact.basis).toBe("unavailable");
  });

  it("repairs malformed-but-parseable output", () => {
    const { raw, speech, fillers } = setup();
    const messy: LlmReport = structuredClone(raw);
    messy.overallScore = 140.7;
    messy.dimensions.clarity = { score: -20, basis: "observed", feedback: "   " };
    messy.dimensions.tone = { score: 50, basis: "unavailable", feedback: "n/a" };
    messy.dimensions.energy = { score: null, basis: "inferred", feedback: "?" };
    messy.strengths = ["", "  "];
    messy.homework = [];
    messy.betterWording = [{ original: "same", improved: "same", why: "" }];
    messy.modeCriteria = [{ name: "X", score: 999, feedback: "" }];
    const report = normalizeReport(messy, { speech, fillers });
    expect(report.overallScore).toBe(100);
    expect(report.dimensions.clarity.score).toBe(0);
    expect(report.dimensions.clarity.feedback).toBeTruthy();
    expect(report.dimensions.tone).toMatchObject({ score: null, basis: "unavailable" });
    expect(report.dimensions.energy).toMatchObject({ score: null, basis: "unavailable" });
    expect(report.strengths).toHaveLength(1);
    expect(report.homework).toHaveLength(1);
    expect(report.betterWording).toHaveLength(0);
    expect(report.modeCriteria[0].score).toBe(100);
  });

  it("marks pace unavailable without duration", () => {
    const { raw, fillers } = setup();
    const speech = computeSpeechMetrics({
      text: MOCK_TRANSCRIPT_TEXT,
      language: null,
      durationSec: null,
      segments: [],
      words: null,
    });
    const report = normalizeReport(raw, { speech, fillers });
    expect(report.dimensions.pace).toMatchObject({ score: null, basis: "unavailable" });
  });
});

describe("mock transcript", () => {
  it("contains a detectable long pause, fillers and a repetition", () => {
    const { speech, fillers } = setup();
    expect(speech.longPauses.length).toBeGreaterThanOrEqual(1);
    expect(fillers.totalFillers).toBeGreaterThanOrEqual(4);
    expect(speech.repetitions.some((r) => r.word === "i")).toBe(true);
    expect(fillers.hasTimeline).toBe(true);
  });
});
