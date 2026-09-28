import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";
import { disconnectSeedDb, seedCompletedSessions } from "./seed";

test.afterAll(async () => {
  await disconnectSeedDb();
});

test.describe("dashboard, progress, history, achievements", () => {
  test("new users see helpful empty states", async ({ page }) => {
    await signUpAndOnboard(page);
    await expect(page.getByText("Your progress will appear here")).toBeVisible();
    await expect(page.getByTestId("daily-challenge")).toBeVisible();
    await page.goto("/progress");
    await expect(page.getByText("No completed sessions in this range")).toBeVisible();
    await page.goto("/history");
    await expect(page.getByText("No sessions yet")).toBeVisible();
    await page.goto("/achievements");
    await expect(page.getByText("0 of 9 unlocked")).toBeVisible();
  });

  test("dashboard shows stats, streak, charts and recent sessions", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await seedCompletedSessions(
      email,
      Array.from({ length: 10 }, (_, i) => ({
        daysAgo: 9 - i, // 10 consecutive days ending today
        score: 60 + i * 2,
        fillerPerMinute: 8 - i * 0.6,
      })),
    );
    await page.goto("/dashboard");
    await expect(
      page.getByText("Sessions", { exact: true }).locator("..").getByText("10"),
    ).toBeVisible();
    await expect(page.getByText("10 days", { exact: true })).toBeVisible(); // streak
    await expect(page.getByRole("img", { name: "Score by session chart" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Sessions per week chart" })).toBeVisible();
    await expect(page.getByText(/down \d+% since you started/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent sessions" })).toBeVisible();
    await page.getByRole("link", { name: /Seeded topic 10/ }).click();
    await expect(page).toHaveURL(/\/sessions\/[a-z0-9]+$/);
    await expect(page.getByTestId("overall-score")).toHaveText("78");
  });

  test("progress page filters by date range", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await seedCompletedSessions(email, [
      { daysAgo: 1, score: 80 },
      { daysAgo: 2, score: 70 },
      { daysAgo: 45, score: 40 },
    ]);
    await page.goto("/progress?range=all");
    await expect(page.getByText("Sessions completed", { exact: true }).locator("..")).toContainText(
      "3",
    );
    await page.getByRole("link", { name: "Last 7 days" }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expect(page.getByText("Sessions completed", { exact: true }).locator("..")).toContainText(
      "2",
    );
    await expect(page.getByText("Average score", { exact: true }).locator("..")).toContainText(
      "75",
    );
    await expect(page.getByRole("img", { name: "Filler words per minute chart" })).toBeVisible();
  });

  test("history search, filters and pagination", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await seedCompletedSessions(email, [
      ...Array.from({ length: 11 }, (_, i) => ({
        daysAgo: i,
        score: 70,
        topic: `Weekend plans ${i}`,
      })),
      {
        daysAgo: 3,
        score: 90,
        mode: "INTERVIEW" as const,
        category: "JOB_INTERVIEW" as const,
        topic: "Tell me about yourself.",
      },
    ]);
    await page.goto("/history");
    await expect(page.getByText("12 sessions")).toBeVisible();
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();

    await page.goto("/history");
    await page.getByLabel("Search topics").fill("yourself");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("1 session match your filters")).toBeVisible();

    await page.goto("/history");
    await page.getByLabel("Mode").selectOption("INTERVIEW");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("link", { name: /Tell me about yourself/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Weekend plans/ })).toHaveCount(0);

    await page.goto("/history?q=nothing-matches-this");
    await expect(page.getByText("No matching sessions")).toBeVisible();
  });

  test("deleting a session from its report removes it everywhere", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    const [id] = await seedCompletedSessions(email, [
      { daysAgo: 0, score: 66, topic: "Delete me please" },
    ]);
    await page.goto(`/sessions/${id}`);
    await page.getByRole("button", { name: "Delete session" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("permanently deleted");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete session" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText("No sessions yet")).toBeVisible();
    const res = await page.request.get(`/api/sessions/${id}`);
    expect(res.status()).toBe(404);
  });

  test("achievements page shows unlocked and locked badges with progress", async ({ page }) => {
    await signUpAndOnboard(page);
    // Complete one real session so the achievement engine runs end-to-end.
    await page.goto("/practice");
    await page.getByRole("radio", { name: "30 sec", exact: true }).click();
    const camera = page.getByRole("switch", { name: "Camera" });
    if ((await camera.getAttribute("aria-checked")) === "true") await camera.click();
    await page.getByRole("button", { name: "Pick a random topic" }).click();
    await page.getByRole("button", { name: "Start speaking" }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("recording-indicator")).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: /Save & get feedback/ }).click();
    await expect(page).toHaveURL(/\/sessions\//, { timeout: 30_000 });

    await page.goto("/achievements");
    await expect(page.getByTestId("achievement-FIRST_PRACTICE")).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    await expect(page.getByTestId("achievement-SEVEN_DAY_STREAK")).toHaveAttribute(
      "data-unlocked",
      "false",
    );
    await expect(page.getByTestId("achievement-SEVEN_DAY_STREAK")).toContainText("1 / 7");
  });
});
