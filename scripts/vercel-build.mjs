// Vercel build entry (runs instead of `npm run build` because package.json
// defines "vercel-build"). Production deploys first apply pending database
// migrations and the idempotent seed (topics + achievements), so a new
// deploy never runs against an out-of-date schema. Preview deploys skip this
// so a branch can never migrate the production database.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    // Lets the very first deploy succeed before the database is configured.
    // Add DATABASE_URL + DIRECT_URL in Vercel, then redeploy to set up the tables.
    console.warn(
      "[vercel-build] WARNING: DATABASE_URL/DIRECT_URL not set: skipping migrations. " +
        "The app will not work until you add them and redeploy.",
    );
  } else {
    run("npx prisma migrate deploy");
    run("npx prisma db seed");
  }
} else {
  console.log(
    `[vercel-build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}: skipping migrations`,
  );
}

run("npx next build");
