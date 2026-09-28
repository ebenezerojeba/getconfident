// Runs a real PostgreSQL server locally (no Docker needed) for development and
// tests, using the `embedded-postgres` binaries. Data lives in .data/postgres.
//
//   npm run db:start      # starts Postgres on port 54329 and keeps running
//
// Production uses Neon (DATABASE_URL / DIRECT_URL) — this script is dev-only.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const port = Number(process.env.LOCAL_PG_PORT ?? 54329);
const databaseDir = path.resolve(".data/postgres");
const databases = ["commcoach", "commcoach_test"];

const pg_ = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  // Match Neon: UTF8, deterministic collation. Without this, initdb inherits the
  // Windows locale (e.g. WIN1252), which cannot store characters that language
  // models routinely emit (curly quotes, em/non-breaking hyphens, emoji).
  initdbFlags: ["--encoding=UTF8", "--lc-collate=C", "--lc-ctype=C"],
  postgresFlags: ["-c", "timezone=UTC"],
  onLog: () => {},
});

const initialised = fs.existsSync(path.join(databaseDir, "PG_VERSION"));
if (!initialised) {
  console.log(`[db] initialising cluster in ${databaseDir}`);
  await pg_.initialise();
}

await pg_.start();

const admin = new pg.Client({
  connectionString: `postgresql://postgres:postgres@localhost:${port}/postgres`,
});
await admin.connect();

for (const name of databases) {
  const { rows } = await admin.query(
    "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = $1",
    [name],
  );
  if (rows.length === 0) {
    // template0 lets us pick the encoding even when the cluster's default differs.
    await admin.query(
      `CREATE DATABASE "${name}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
    console.log(`[db] created database ${name} (UTF8)`);
  } else if (rows[0].encoding !== "UTF8") {
    console.warn(
      `[db] WARNING: database "${name}" is ${rows[0].encoding}, not UTF8.\n` +
        "      Text the AI produces (curly quotes, non-breaking hyphens, emoji) will fail to\n" +
        "      store. Recreate it with: npm run db:recreate -- " +
        name,
    );
  }
}
await admin.end();

console.log(`[db] PostgreSQL ready on postgresql://postgres:postgres@localhost:${port}/commcoach`);

const shutdown = async () => {
  console.log("[db] stopping");
  await pg_.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (process.argv.includes("--once")) {
  await shutdown();
}
