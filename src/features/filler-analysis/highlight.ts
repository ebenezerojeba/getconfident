import type { Filler, FillerOccurrence } from "./analyze";

export type TranscriptPart = { text: string; filler: Filler | null };

const WORD_RE = /[a-z0-9]+(?:['’][a-z]+)*/gi;

/**
 * Splits a transcript into plain and filler parts using the word indexes
 * produced by analyzeFillers (same tokenization), so the UI can highlight them.
 */
export function highlightTranscript(
  text: string,
  occurrences: FillerOccurrence[],
): TranscriptPart[] {
  const starts = new Map<number, Filler>();
  for (const o of occurrences) starts.set(o.wordIndex, o.filler);

  const parts: TranscriptPart[] = [];
  let cursor = 0;
  let index = 0;
  const matches = [...text.matchAll(WORD_RE)];
  for (let i = 0; i < matches.length; i++, index++) {
    const filler = starts.get(index);
    if (!filler) continue;
    const words = filler.includes(" ") ? 2 : 1;
    const start = matches[i].index!;
    const last = matches[Math.min(i + words - 1, matches.length - 1)];
    const end = last.index! + last[0].length;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), filler: null });
    parts.push({ text: text.slice(start, end), filler });
    cursor = end;
    i += words - 1;
    index += words - 1;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), filler: null });
  return parts;
}
