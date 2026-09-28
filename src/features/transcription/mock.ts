import type { NormalizedTranscript } from "./types";

/**
 * DEV/TEST ONLY sample transcript. Deliberately contains filler words, a
 * repetition and a long pause so the full analysis pipeline can be exercised
 * without real speech-to-text.
 */
export const MOCK_TRANSCRIPT_TEXT =
  "So, I think the most important thing is, um, being clear about your main point. " +
  "When I started my first job I I was nervous about speaking in meetings. " +
  "Basically, I would, like, rush through everything. Over time I learned to slow down, " +
  "pause, and structure my answer with a point, a reason and an example. " +
  "That made a real difference, you know. Now I actually enjoy presenting ideas to my team.";

/** Builds a timed transcript (~2.5 words/sec) with one 2.4s pause mid-way. */
export function mockTranscript(text: string): NormalizedTranscript {
  const tokens = text.split(/\s+/).filter(Boolean);
  const words: NormalizedTranscript["words"] = [];
  let t = 0.3;
  tokens.forEach((token, i) => {
    if (i === Math.floor(tokens.length / 2)) t += 2.4;
    const start = t;
    const end = start + 0.32;
    words.push({ word: token.replace(/[^a-z0-9']/gi, ""), start, end });
    t = end + 0.08;
  });
  const segments: NormalizedTranscript["segments"] = [];
  const sentences = text.match(/[^.!?]+[.!?]/g) ?? [text];
  let wi = 0;
  for (const s of sentences) {
    const n = s.trim().split(/\s+/).length;
    const first = words[wi];
    const last = words[Math.min(words.length - 1, wi + n - 1)];
    if (first && last) segments.push({ start: first.start, end: last.end, text: s.trim() });
    wi += n;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    text,
    language: "en",
    durationSec: round(t + 0.3),
    segments: segments.map((s) => ({ ...s, start: round(s.start), end: round(s.end) })),
    words: words.map((w) => ({ ...w, start: round(w.start), end: round(w.end) })),
  };
}
