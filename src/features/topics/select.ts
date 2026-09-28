export type Candidate = { id: string };

/** Number of most-recently-shown topics to avoid repeating. */
export const RECENT_WINDOW = 40;

/**
 * Picks a random candidate, avoiding recently shown ones.
 *
 * @param candidates topics matching the user's filters
 * @param recentIds  topic ids shown to the user, most recent first
 * @param random     injectable RNG in [0, 1) for deterministic tests
 *
 * If every candidate was shown recently (small filtered pools), falls back to
 * the one shown longest ago, and never returns the immediately previous topic
 * unless it is the only candidate.
 */
export function pickTopic<T extends Candidate>(
  candidates: readonly T[],
  recentIds: readonly string[],
  random: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const recent = new Set(recentIds.slice(0, RECENT_WINDOW));
  const fresh = candidates.filter((c) => !recent.has(c.id));
  if (fresh.length > 0) return fresh[Math.floor(random() * fresh.length) % fresh.length];

  // All candidates seen recently: choose the least recently shown.
  const position = new Map<string, number>();
  recentIds.forEach((id, i) => {
    if (!position.has(id)) position.set(id, i);
  });
  let best = candidates[0];
  let bestPos = -1;
  for (const c of candidates) {
    const pos = position.get(c.id) ?? Number.POSITIVE_INFINITY;
    if (pos > bestPos) {
      best = c;
      bestPos = pos;
    }
  }
  return best;
}
