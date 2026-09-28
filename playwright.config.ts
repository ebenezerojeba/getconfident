import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // One local retry: this machine runs Postgres, Next, Chromium and the
  // background analysis jobs at once, which occasionally starves a request.
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  // The server does real background work (transcription/analysis) between tests,
  // so allow a little longer than the 5s default for assertions to settle.
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Synthetic camera + microphone so recording flows run for real in CI.
        permissions: ["camera", "microphone"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        },
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: process.env.PW_SERVER_LOGS ? "pipe" : "ignore",
    stderr: "pipe",
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-build",
      // E2E runs use the isolated mock AI provider (no real credentials in CI).
      AI_PROVIDER: process.env.E2E_AI_PROVIDER ?? "mock",
      ALLOW_MOCK_AI_IN_PRODUCTION: "1",
    },
  },
});
