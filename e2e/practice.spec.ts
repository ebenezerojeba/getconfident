import type { Page } from "@playwright/test";

import { expect, freshClientHeaders, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

async function setupSession(
  page: Page,
  opts: { mode?: string; duration?: string; video?: boolean } = {},
) {
  await page.goto("/practice");
  if (opts.mode) await page.getByRole("radio", { name: new RegExp(opts.mode) }).click();
  await page.getByRole("radio", { name: opts.duration ?? "30 sec", exact: true }).click();
  const camera = page.getByRole("switch", { name: "Camera" });
  if ((await camera.getAttribute("aria-checked")) !== String(opts.video ?? false))
    await camera.click();

  await page.getByRole("button", { name: "Pick a random topic" }).click();
  const topic = page.getByTestId("topic-text");
  await expect(topic).toBeVisible();
  return (await topic.textContent())!;
}

async function recordFor(page: Page, ms: number) {
  await expect(page.getByText("Microphone ready")).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("countdown")).toBeVisible();
  await expect(page.getByTestId("recording-indicator")).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(ms);
}

test.describe("practice flow", () => {
  test.setTimeout(90_000);

  test("voice-only: topic → countdown → record → finish → processing → AI report", async ({
    page,
  }) => {
    await signUpAndOnboard(page);
    const first = await setupSession(page, { video: false });

    // Generate another topic replaces it with a different one.
    await page.getByRole("button", { name: "Generate another topic" }).click();
    await expect(page.getByTestId("topic-text")).not.toHaveText(first);
    const topic = (await page.getByTestId("topic-text").textContent())!;

    await page.getByRole("button", { name: "Start speaking" }).click();
    await expect(page).toHaveURL(/\/practice\/[a-z0-9]+$/);
    await expect(page.getByTestId("session-topic")).toHaveText(topic);
    await expect(page.getByText("Voice only")).toBeVisible();

    await recordFor(page, 2500);
    await expect(page.getByRole("timer")).toBeVisible();

    // Pause stops the clock.
    await page.getByRole("button", { name: "Pause" }).click();
    const paused = await page.getByRole("timer").textContent();
    await page.waitForTimeout(1500);
    await expect(page.getByRole("timer")).toHaveText(paused!);
    await page.getByRole("button", { name: "Resume" }).click();
    await page.waitForTimeout(1200);

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Recorded/ })).toBeVisible();
    await expect(page.getByLabel("Your recording")).toBeVisible();

    await page.getByRole("button", { name: /Save & get feedback/ }).click();
    // Processing view, then automatic navigation to the report.
    await expect(page).toHaveURL(/\/sessions\/[a-z0-9]+$/, { timeout: 30_000 });
    await expect(page.getByTestId("overall-score")).toBeVisible();
    await expect(page.getByText("Development analysis")).toBeVisible();
    await expect(page.getByRole("heading", { name: topic })).toBeVisible();
    await expect(page.getByTestId("transcript").locator("mark").first()).toBeVisible();
    for (const heading of [
      "What you did well",
      "What to improve",
      "Speaking metrics",
      "Filler words",
      "Structure",
      "Grammar",
      "Delivery",
      "Homework",
      "Next challenge",
    ]) {
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
    }
    // Eye contact is never invented.
    await expect(
      page.getByText("Not measured: video/body-language analysis isn't available yet."),
    ).toBeVisible();
    // Recording is streamed through the authorized endpoint.
    await expect(page.getByLabel("Session recording")).toHaveAttribute(
      "src",
      /\/api\/recordings\//,
    );
  });

  test("video: records camera + audio and plays it back from the report", async ({ page }) => {
    await signUpAndOnboard(page);
    await setupSession(page, { video: true, mode: "Interview" });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await expect(page.getByLabel("Camera preview")).toBeVisible();
    await recordFor(page, 2500);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: /Save & get feedback/ }).click();
    await expect(page).toHaveURL(/\/sessions\/[a-z0-9]+$/, { timeout: 30_000 });
    const video = page.getByLabel("Session recording");
    await expect(video).toBeVisible();
    const src = await video.getAttribute("src");
    const res = await page.request.get(src!, { headers: { Range: "bytes=0-99" } });
    expect(res.status()).toBe(206);
    expect(res.headers()["content-type"]).toContain("video/");
  });

  test("timer completion finishes the recording automatically", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpAndOnboard(page);
    await setupSession(page, { video: false, duration: "30 sec" });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await recordFor(page, 0);
    await expect(page.getByRole("status").filter({ hasText: /Recorded 0:3\d/ })).toBeVisible({
      timeout: 40_000,
    });
  });

  test("retake discards the take; delete cancels the session", async ({ page }) => {
    await signUpAndOnboard(page);
    await setupSession(page, { video: false });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await recordFor(page, 1500);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Retake" }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();

    await recordFor(page, 1200);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Delete this recording?");
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(page).toHaveURL(/\/practice$/);
  });

  test("restart during recording returns to the start screen", async ({ page }) => {
    await signUpAndOnboard(page);
    await setupSession(page, { video: false });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await recordFor(page, 1000);
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  });

  test("permission denied shows guidance and a voice-only fallback", async ({ page }) => {
    await signUpAndOnboard(page);
    await setupSession(page, { video: true });
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (c?: MediaStreamConstraints) => {
        if (c?.video) throw new DOMException("denied", "NotAllowedError");
        return original(c);
      };
    });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await expect(page).toHaveURL(/\/practice\/[a-z0-9]+$/);
    await page.reload(); // init scripts only apply to full page loads
    await expect(page.getByRole("alert").filter({ hasText: "Permission needed" })).toBeVisible();
    await page.getByRole("button", { name: "Continue with voice only" }).click();
    await expect(page.getByText("Voice only")).toBeVisible();
    await expect(page.getByText("Microphone ready")).toBeVisible();
  });

  test("unsupported browsers get a clear message", async ({ page }) => {
    await signUpAndOnboard(page);
    await setupSession(page, { video: false });
    await page.addInitScript(() => {
      // @ts-expect-error simulate a browser without MediaRecorder
      delete window.MediaRecorder;
    });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await expect(page).toHaveURL(/\/practice\/[a-z0-9]+$/);
    await page.reload();
    await expect(
      page.getByRole("alert").filter({ hasText: "Browser not supported" }),
    ).toBeVisible();
  });

  test("another user's session is not accessible", async ({ page, browser }) => {
    await signUpAndOnboard(page);
    await setupSession(page, { video: false });
    await page.getByRole("button", { name: "Start speaking" }).click();
    await expect(page).toHaveURL(/\/practice\/[a-z0-9]+$/);
    const url = page.url();
    const id = url.split("/").pop();

    const ctx = await browser.newContext({ extraHTTPHeaders: freshClientHeaders() });
    const other = await ctx.newPage();
    await signUpAndOnboard(other);
    await other.goto(url);
    await expect(other.getByRole("heading", { name: "Page not found" })).toBeVisible();
    const api = await other.request.get(`/api/sessions/${id}`);
    expect(api.status()).toBe(404);
    const rec = await other.request.get(`/api/recordings/${id}`);
    expect(rec.status()).toBe(404);
    await ctx.close();
  });
});

test.describe("upload resilience", () => {
  test.setTimeout(90_000);

  test("a failed upload keeps the recording and can be retried", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/practice");
    await page.getByRole("radio", { name: "30 sec", exact: true }).click();
    const camera = page.getByRole("switch", { name: "Camera" });
    if ((await camera.getAttribute("aria-checked")) === "true") await camera.click();
    await page.getByRole("button", { name: "Pick a random topic" }).click();
    await page.getByRole("button", { name: "Start speaking" }).click();
    await expect(page.getByText("Microphone ready")).toBeVisible();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("recording-indicator")).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Finish" }).click();

    // First upload attempt fails at the network level.
    let attempts = 0;
    await page.route("**/api/sessions/*/recording", async (route) => {
      attempts++;
      if (attempts === 1) return route.abort("failed");
      return route.continue();
    });
    await page.getByRole("button", { name: /Save & get feedback/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Upload failed" })).toBeVisible();

    await page.getByRole("button", { name: "Retry upload" }).click();
    await expect(page).toHaveURL(/\/sessions\/[a-z0-9]+$/, { timeout: 30_000 });
    expect(attempts).toBe(2);
  });
});

test.describe("follow-up questions", () => {
  test.setTimeout(120_000);

  test("asks follow-ups, accepts spoken answers and enforces the limit", async ({ page }) => {
    const { signUpAndOnboard } = await import("./helpers");
    const { seedCompletedSessions } = await import("./seed");
    const { email } = await signUpAndOnboard(page);
    const [sessionId] = await seedCompletedSessions(email, [{ daysAgo: 0, score: 75 }]);

    await page.goto(`/sessions/${sessionId}`);
    const section = page.getByTestId("follow-ups");
    await expect(section).toBeVisible();

    for (let i = 1; i <= 3; i++) {
      await section
        .getByRole("button", { name: i === 1 ? "Ask me a follow-up" : "Next question" })
        .click();
      await expect(page.getByTestId(`follow-up-${i}`)).toBeVisible();
      await section.getByRole("button", { name: `Answer question ${i}` }).click();
      await expect(section.getByText("Recording your answer")).toBeVisible();
      await page.waitForTimeout(1200);
      await section.getByRole("button", { name: "Finish answer" }).click();
      // Answer is transcribed and evaluated.
      await expect(page.getByTestId(`follow-up-${i}`).getByText(/\/100/)).toBeVisible({
        timeout: 30_000,
      });
    }

    await expect(section.getByText(/That's all 3 follow-ups/)).toBeVisible();
    await expect(section.getByRole("button", { name: "Next question" })).toHaveCount(0);

    // Persisted: they survive a reload.
    await page.reload();
    await expect(page.getByTestId("follow-up-3")).toBeVisible();
    await expect(page.getByTestId("follow-ups").getByText(/\/100/)).toHaveCount(3);

    // The API refuses a fourth question.
    const res = await page.request.post(`/api/sessions/${sessionId}/follow-ups`);
    expect(res.status()).toBe(409);
  });
});
