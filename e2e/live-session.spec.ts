/**
 * One real end-to-end session against the configured live AI provider.
 * Chromium plays .data/tts-sample.wav as the microphone, so the app records
 * actual speech, transcribes it and analyzes it for real.
 *
 *   npm run db:start                      # in another terminal
 *   npm run tts:sample                     # generates .data/tts-sample.wav (Windows)
 *   E2E_AI_PROVIDER=openai npx playwright test e2e/live-session.spec.ts
 */
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

const SAMPLE = path.resolve(".data/tts-sample.wav");

test.use({
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${SAMPLE}%noloop`,
    ],
  },
});

// Only runs against a live provider with a speech sample present; the normal
// suite (mock provider) skips it.
const LIVE = process.env.E2E_AI_PROVIDER === "openai" && fs.existsSync(SAMPLE);

test.skip(!LIVE, "live provider check: run with E2E_AI_PROVIDER=openai and .data/tts-sample.wav");

test("live provider: record real speech and get a real report", async ({ page }) => {
  test.setTimeout(180_000);

  await signUpAndOnboard(page);
  await page.goto("/practice");
  await page.getByRole("radio", { name: "30 sec", exact: true }).click();
  const camera = page.getByRole("switch", { name: "Camera" });
  if ((await camera.getAttribute("aria-checked")) === "true") await camera.click();
  await page.getByRole("button", { name: "Pick a random topic" }).click();
  const topic = (await page.getByTestId("topic-text").textContent())!;

  await page.getByRole("button", { name: "Start speaking" }).click();
  await expect(page.getByText("Microphone ready")).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("recording-indicator")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(12_000); // let the whole sample play
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("button", { name: /Save & get feedback/ }).click();

  await expect(page).toHaveURL(/\/sessions\/[a-z0-9]+$/, { timeout: 120_000 });

  // A real report: no mock banner anywhere.
  await expect(page.getByText("Development analysis")).toHaveCount(0);
  const transcript = (await page.getByTestId("transcript").textContent()) ?? "";
  const score = await page.getByTestId("overall-score").textContent();

  expect(transcript.length).toBeGreaterThan(40);
  // The first word or two can be clipped as the recorder spins up.
  expect(transcript.toLowerCase()).toContain("three weeks");
  expect(Number(score)).toBeGreaterThan(0);

  fs.writeFileSync(
    ".data/live-session-check.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        topic,
        overallScore: Number(score),
        transcript: transcript.trim(),
        url: page.url(),
      },
      null,
      2,
    ),
    "utf8",
  );
});
