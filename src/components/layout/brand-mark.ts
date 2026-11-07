/**
 * GetConfident mark geometry: a speech-bubble "G" with a rising arrow.
 * Drawn on a 96-unit grid (ring weight 19u, arrow weight 13u, 45° axis from
 * the bubble tail to the arrow tip). Shared by the React logo, generated PNG
 * icons (next/og) and the static SVG favicon, so every surface matches.
 */
export const BRAND_COLORS = {
  navy: "#0B1A3A",
  navyLift: "#16295A",
  violet: "#6A4CFF",
  violetLight: "#A497FF",
  mist: "#F5F6FA",
  white: "#FFFFFF",
} as const;

export const MARK_VIEWBOX = "0 0 96 96";

/** Ring of the G: opens at the top-right, stroked at 19u. */
export const MARK_RING = { d: "M50 13.5H48A34.5 34.5 0 1 0 82.5 48", strokeWidth: 19 };

/** Crossbar of the G plus the bubble tail (filled). */
export const MARK_BODY =
  "M51.6 37H87.5Q92 37 92 41.5V48L91.36 55.5H51.6A9.25 9.25 0 0 1 51.6 37Z" +
  "M10.2 71.3L7.8 86.9L24.2 85.3L28 72Z";

/** Arrow shaft (stroked at 13u) and head (filled). */
export const MARK_SHAFT = { d: "M51.6 47.2L72.5 25.4", strokeWidth: 13 };
export const MARK_HEAD = "M88.2 9.1L62.8 15.6L82.2 35.1Z";

/** Static SVG markup of the mark, for places that need a string (favicon, emails). */
export function markSvg({ g, arrow, size }: { g: string; arrow: string; size?: number }): string {
  const dims = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"${dims}><path d="${MARK_RING.d}" fill="none" stroke="${g}" stroke-width="${MARK_RING.strokeWidth}" stroke-linecap="round"/><path d="${MARK_BODY}" fill="${g}" stroke="${g}" stroke-width="1.5" stroke-linejoin="round"/><path d="${MARK_SHAFT.d}" stroke="${arrow}" stroke-width="${MARK_SHAFT.strokeWidth}" stroke-linecap="round"/><path d="${MARK_HEAD}" fill="${arrow}" stroke="${arrow}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
