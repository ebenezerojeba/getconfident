import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Live provider checks (`npm run verify:ai`). Separate from the integration
 * config so the normal suites never call a paid/rate-limited API. Uses the real
 * .env, so OPENAI_* settings apply.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve("tests/support/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/live/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 180_000,
  },
});
