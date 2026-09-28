import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Default environment is node (fast). Component tests opt into the DOM with
// a `// @vitest-environment jsdom` docblock at the top of the file.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e/**", "tests/integration/**", "tests/live/**"],
    css: false,
  },
});
