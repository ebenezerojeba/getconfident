// Drops and recreates a LOCAL development database as UTF8.
//
//   npm run db:recreate -- commcoach commcoach_test
//
// Why: initdb inherits the OS locale on Windows, producing a WIN1252 cluster
// that cannot store characters language models routinely emit (curly quotes,
// non-breaking hyphens, emoji). Postgres cannot convert a database in place.
//
// Guarded: refuses anything but the known local development databases on the
// local embedded-postgres port. It never touches a remote/production server.
import pg from "pg";

const ALLOWED = new Set(["commcoach", "commcoach_test"]);
const port = Number(process.env.LOCAL_PG_PORT ?? 54329);
const names = process.argv.slice(2).filter((a) => !a.startsWith("-"));

if (names.length === 0) {
  console.error("Usage: npm run db:recreate -- commcoach [commcoach_test]");
  process.exit(1);
}
for (const name of names) {
  if (!ALLOWED.has(name)) {
    console.error(`Refusing to drop "${name}": not a known local development database.`);
    process.exit(1);
  }
}

const admin = new pg.Client({
  connectionString: `postgresql://postgres:postgres@localhost:${port}/postgres`,
});
await admin.connect();

for (const name of names) {
  const before = await admin.query(
    "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = $1",
    [name],
  );
  // FORCE closes other sessions (the dev server is usually connected).
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.query(
    `CREATE DATABASE "${name}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
  );
  console.log(`[db] recreated ${name}: ${before.rows[0]?.encoding ?? "absent"} -> UTF8`);
}

await admin.end();
console.log("[db] next: npm run db:deploy && npm run db:seed");
