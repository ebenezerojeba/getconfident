/**
 * Test-only data seeding for E2E specs. Delegates to e2e/seed-cli.mts (run with
 * tsx, because the generated Prisma client is ESM) and writes directly to the
 * database the E2E server uses. Nothing here is reachable from the application.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

export type SeedSession = {
  daysAgo: number;
  score: number;
  fillerPerMinute?: number;
  mode?: string;
  category?: string;
  topic?: string;
};

export async function seedCompletedSessions(
  email: string,
  sessions: SeedSession[],
): Promise<string[]> {
  const tsx = path.resolve("node_modules/tsx/dist/cli.mjs");
  const out = execFileSync(
    process.execPath,
    [tsx, "e2e/seed-cli.mts", JSON.stringify({ email, sessions })],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  // dotenv prints a banner to stdout; the ids are on the last line.
  return JSON.parse(out.trim().split(/\r?\n/).pop()!);
}

export async function disconnectSeedDb() {}
