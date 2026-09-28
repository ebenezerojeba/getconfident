import { execSync } from "node:child_process";

/**
 * Applies pending migrations to the test database once per run.
 * Deliberately non-destructive (no reset): tests isolate themselves with
 * unique per-run identifiers (see tests/support/factories.ts → uid()).
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:54329/commcoach_test";
  if (!/_test\b/.test(url)) {
    throw new Error(`Refusing to run integration tests against a non-test database: ${url}`);
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
