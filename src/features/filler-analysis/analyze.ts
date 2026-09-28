/**
 * Deterministic, context-aware filler-word detection.
 *
 * Tokens are matched with word boundaries and surrounding context so ordinary
 * uses ("I like pizza", "what kind of music", "so that") are not counted.
 * Punctuation from the transcript is used as a signal for spoken pauses.
 */

export const FILLERS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "actually",
  "literally",
  "so",
  "kind of",
  "sort of",
] as const;
export type Filler = (typeof FILLERS)[number];

export type TimedWord = { word: string; start: number; end: number };

export type FillerOccurrence = {
  filler: Filler;
  /** Index of the (first) word in the transcript's word sequence. */
  wordIndex: number;
  /** Seconds from the start, when word timestamps are available. */
  time: number | null;
};

export type FillerStat = {
  filler: Filler;
  count: number;
  /** Share of all spoken words, 0–100. */
  percentOfWords: number;
  perMinute: number | null;
};

export type FillerAnalysis = {
  totalWords: number;
  totalFillers: number;
  /** Fillers as a share of all words, 0–100. */
  fillerPercent: number;
  perMinute: number | null;
  durationSec: number | null;
  byFiller: FillerStat[];
  occurrences: FillerOccurrence[];
  hasTimeline: boolean;
  suggestions: string[];
};

type Token = {
  word: string; // lower-cased, apostrophes kept
  /** Punctuation between the previous word and this one ("" if none). */
  before: string;
  /** Punctuation between this word and the next one ("" if none). */
  after: string;
};

const SENTENCE_END = /[.!?]/;
const PAUSE = /[,;:—–-]|\.\.\./;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /([a-z0-9]+(?:['’][a-z]+)*)|([.,!?;:—–]|\.\.\.|\s-\s)/gi;
  let pending = "";
  for (const m of text.matchAll(re)) {
    if (m[1]) {
      if (tokens.length) tokens[tokens.length - 1].after = pending;
      tokens.push({ word: m[1].toLowerCase().replace(/’/g, "'"), before: pending, after: "" });
      pending = "";
    } else {
      pending += m[2].trim() || "-";
    }
  }
  if (tokens.length) tokens[tokens.length - 1].after = pending;
  return tokens;
}

const LIKE_VERB_CONTEXT = new Set([
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "would",
  "i'd",
  "you'd",
  "we'd",
  "they'd",
  "he'd",
  "she'd",
  "do",
  "don't",
  "does",
  "doesn't",
  "did",
  "didn't",
  "to",
  "not",
  "really",
  "also",
  "look",
  "looks",
  "looked",
  "looking",
  "seem",
  "seems",
  "seemed",
  "sound",
  "sounds",
  "sounded",
  "feel",
  "feels",
  "felt",
  "feeling",
  "just",
  "something",
  "anything",
  "nothing",
  "everything",
  "much",
  "more",
  "most",
  "people",
  "who",
  "might",
  "may",
  "will",
  "would",
  "should",
  "could",
  "can",
  "they'll",
  "i'll",
  "you'll",
  "especially",
  "things",
  "stuff",
  "exactly",
  "act",
  "acts",
  "acted",
  "be",
  "taste",
  "tastes",
  "smell",
  "smells",
]);

const DETERMINERS = new Set([
  "what",
  "which",
  "this",
  "that",
  "these",
  "those",
  "the",
  "a",
  "an",
  "some",
  "any",
  "every",
  "each",
  "one",
  "no",
  "same",
  "different",
  "other",
  "another",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their",
  "its",
  "whatever",
  "what's",
]);

const SO_NON_FILLER_NEXT = new Set([
  "that",
  "much",
  "many",
  "far",
  "long",
  "what",
  "far",
  "often",
  "few",
  "little",
  "called",
]);

const YOU_KNOW_NON_FILLER_PREV = new Set([
  "do",
  "did",
  "don't",
  "didn't",
  "does",
  "doesn't",
  "if",
  "as",
  "would",
  "could",
  "might",
  "you'll",
  "will",
  "to",
  "what",
  "how",
  "why",
  "who",
]);
const YOU_KNOW_NON_FILLER_NEXT = new Set([
  "that",
  "how",
  "why",
  "where",
  "who",
  "whether",
  "if",
  "the",
  "a",
  "an",
  "him",
  "her",
  "them",
  "it",
  "me",
  "us",
  "about",
  "what's",
  "when",
  "which",
  "anything",
  "something",
  "someone",
  "somebody",
  "everything",
  "nothing",
  "enough",
  "better",
  "each",
]);

const isSentenceStart = (t: Token, i: number) => i === 0 || SENTENCE_END.test(t.before);
const pausedBefore = (t: Token, i: number) => isSentenceStart(t, i) || PAUSE.test(t.before);
const pausedAfter = (t: Token, isLast: boolean) =>
  isLast || PAUSE.test(t.after) || SENTENCE_END.test(t.after);
const isNumber = (w?: string) => !!w && /^\d/.test(w);

/** Returns [filler, tokensConsumed] when a filler starts at index i. */
function matchAt(tokens: Token[], i: number): [Filler, number] | null {
  const t = tokens[i];
  const prev = tokens[i - 1]?.word;
  const next = tokens[i + 1];
  const isLast = i === tokens.length - 1;
  const w = t.word;

  if (/^u+m+$|^u+h+m*$|^h?mm+$|^e+r+m+$|^e+rr+$/.test(w)) {
    return [/^u+h/.test(w) || /^e+r/.test(w) ? "uh" : "um", 1];
  }

  if (w === "you" && next?.word === "know" && !t.after) {
    const afterKnow = tokens[i + 2]?.word;
    const knowIsLast = i + 1 === tokens.length - 1;
    const knowPausedAfter = pausedAfter(next, knowIsLast);
    if (prev && YOU_KNOW_NON_FILLER_PREV.has(prev) && !pausedBefore(t, i)) return null;
    if (!knowPausedAfter && afterKnow && YOU_KNOW_NON_FILLER_NEXT.has(afterKnow)) return null;
    if (
      knowPausedAfter ||
      pausedBefore(t, i) ||
      (afterKnow && !YOU_KNOW_NON_FILLER_NEXT.has(afterKnow))
    ) {
      return ["you know", 2];
    }
    return null;
  }

  if ((w === "kind" || w === "sort") && next?.word === "of" && !t.after) {
    if (prev && DETERMINERS.has(prev) && !pausedBefore(t, i)) return null;
    return [w === "kind" ? "kind of" : "sort of", 2];
  }

  if (w === "like") {
    if (pausedAfter(t, isLast) && !isLast) return ["like", 1];
    if (prev && LIKE_VERB_CONTEXT.has(prev) && !pausedBefore(t, i)) return null;
    if (pausedBefore(t, i)) return ["like", 1];
    // "it was like five minutes" — approximation before a number.
    if (isNumber(next?.word)) return ["like", 1];
    return null;
  }

  if (w === "basically") return ["basically", 1];

  if (w === "literally") {
    if (next && /^(means?|meant|meaning|translat)/.test(next.word) && !t.after) return null;
    return ["literally", 1];
  }

  if (w === "actually") {
    return pausedBefore(t, i) || pausedAfter(t, isLast) ? ["actually", 1] : null;
  }

  if (w === "so") {
    if (next && !t.after && SO_NON_FILLER_NEXT.has(next.word)) return null;
    if (pausedAfter(t, isLast) && !isLast && isSentenceStart(t, i)) return ["so", 1];
    if (isSentenceStart(t, i) && next) return ["so", 1];
    if (PAUSE.test(t.before) && PAUSE.test(t.after)) return ["so", 1];
    return null;
  }

  return null;
}

/** Aligns transcript word indexes with provider word timestamps (greedy, windowed). */
function alignTimes(tokens: Token[], words: TimedWord[]): (number | null)[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
  const times: (number | null)[] = new Array(tokens.length).fill(null);
  let j = 0;
  for (let i = 0; i < tokens.length && j < words.length; i++) {
    for (let k = j; k < Math.min(words.length, j + 6); k++) {
      if (norm(words[k].word) === tokens[i].word.replace(/’/g, "'")) {
        times[i] = words[k].start;
        j = k + 1;
        break;
      }
    }
  }
  return times;
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function analyzeFillers(
  text: string,
  options: { durationSec?: number | null; words?: TimedWord[] | null } = {},
): FillerAnalysis {
  const tokens = tokenize(text);
  const durationSec = options.durationSec && options.durationSec > 0 ? options.durationSec : null;
  const minutes = durationSec ? durationSec / 60 : null;
  const times = options.words?.length ? alignTimes(tokens, options.words) : null;

  const occurrences: FillerOccurrence[] = [];
  for (let i = 0; i < tokens.length;) {
    const match = matchAt(tokens, i);
    if (match) {
      occurrences.push({ filler: match[0], wordIndex: i, time: times?.[i] ?? null });
      i += match[1];
    } else {
      i += 1;
    }
  }

  const totalWords = tokens.length;
  const counts = new Map<Filler, number>();
  for (const o of occurrences) counts.set(o.filler, (counts.get(o.filler) ?? 0) + 1);

  const byFiller: FillerStat[] = FILLERS.map((filler) => {
    const count = counts.get(filler) ?? 0;
    return {
      filler,
      count,
      percentOfWords: totalWords ? round((count / totalWords) * 100) : 0,
      perMinute: minutes ? round(count / minutes) : null,
    };
  })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalFillers = occurrences.length;
  const analysis: FillerAnalysis = {
    totalWords,
    totalFillers,
    fillerPercent: totalWords ? round((totalFillers / totalWords) * 100) : 0,
    perMinute: minutes ? round(totalFillers / minutes) : null,
    durationSec,
    byFiller,
    occurrences,
    hasTimeline: occurrences.some((o) => o.time !== null),
    suggestions: [],
  };
  analysis.suggestions = fillerSuggestions(analysis);
  return analysis;
}

const TIPS: Record<Filler, string> = {
  um: 'Replace "um" with a silent pause. A one-second pause sounds confident; a filler sounds unsure.',
  uh: 'When you feel an "uh" coming, close your mouth and breathe. Silence is shorter than it feels.',
  like: 'Notice "like" before examples or numbers. State the example directly: "about five minutes", not "like five minutes".',
  "you know":
    '"You know" asks the audience for reassurance. Trust your point and end the sentence cleanly.',
  basically: '"Basically" usually adds nothing. Try deleting it and starting with the main idea.',
  actually: 'Save "actually" for real corrections so it keeps its meaning.',
  literally: 'Use "literally" only when something is literally true; otherwise cut it.',
  so: 'Avoid starting sentences with "So". Open with your key point or a transition like "First,".',
  "kind of": '"Kind of" softens your claims. Commit to the statement to sound more confident.',
  "sort of": '"Sort of" hedges your message. Say what you mean directly.',
};

export function fillerSuggestions(
  a: Pick<FillerAnalysis, "totalFillers" | "perMinute" | "fillerPercent" | "byFiller">,
): string[] {
  if (a.totalFillers === 0) {
    return ["No filler words detected. Keep using deliberate pauses to stay this clean."];
  }
  const tips = a.byFiller.slice(0, 3).map((s) => TIPS[s.filler]);
  const rate = a.perMinute ?? null;
  if ((rate !== null && rate > 6) || a.fillerPercent > 5) {
    tips.push(
      "Your filler rate is high. Practice 60-second answers where you pause silently instead of filling gaps, then compare scores.",
    );
  } else if ((rate !== null && rate > 3) || a.fillerPercent > 2) {
    tips.push(
      "You're close. Aim for fewer than 3 fillers per minute by slowing down slightly between ideas.",
    );
  }
  return tips;
}
