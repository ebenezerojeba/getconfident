import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma Migrate uses the direct (non-pooled) connection. Falls back to
// DATABASE_URL for local setups where both are the same.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
