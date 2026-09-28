import path from "node:path";

import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/commcoach_test";

// Integration tests run against a real PostgreSQL database (see scripts/db-local.mjs).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // "server-only" throws outside React Server Components; it's a no-op here.
      "server-only": path.resolve("tests/support/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // Live provider checks run separately (npm run verify:ai, vitest.live.config.mts)
    // so this suite never calls a paid or rate-limited API.
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/integration-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "test-secret-test-secret-test-secret-123456",
      AI_PROVIDER: "mock",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: ".data/test-storage",
    },
  },
});
