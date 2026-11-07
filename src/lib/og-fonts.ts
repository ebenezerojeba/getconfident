import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Plus Jakarta Sans for images generated with next/og (social preview, share
 * card). Satori can't use the web font from next/font, so the WOFF files ship
 * in src/assets/fonts (SIL OFL) and are traced into the server bundle via
 * outputFileTracingIncludes in next.config.ts.
 */
const WEIGHTS = [400, 500, 700, 800] as const;

function load() {
  return Promise.all(
    WEIGHTS.map(async (weight) => ({
      name: "Plus Jakarta Sans",
      weight,
      style: "normal" as const,
      data: await readFile(
        join(process.cwd(), `src/assets/fonts/plus-jakarta-sans-latin-${weight}-normal.woff`),
      ),
    })),
  );
}

let cache: ReturnType<typeof load> | null = null;

export function brandFonts() {
  cache ??= load();
  return cache;
}
