import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";
import { seedCompletedSessions } from "./seed";

test.describe("since day one", () => {
  test.setTimeout(90_000);

  test("new users see the starting assessment note", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/practice");
    await expect(page.getByTestId("starting-assessment")).toBeVisible();
  });

  test("dashboard and reports compare with the first session", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    const ids = await seedCompletedSessions(email, [
      { daysAgo: 6, score: 58, fillerPerMinute: 6 },
      { daysAgo: 4, score: 64, fillerPerMinute: 4 },
      { daysAgo: 2, score: 68, fillerPerMinute: 3 },
      { daysAgo: 0, score: 72, fillerPerMinute: 2 },
    ]);

    await page.goto("/dashboard");
    const card = page.getByTestId("journey-card");
    await expect(card).toBeVisible();
    // Day one 6/min → recent avg 3/min.
    await expect(card.getByTestId("journey-highlight")).toHaveText(
      "You use 50% fewer filler words than on day one.",
    );

    await page.goto(`/sessions/${ids[3]}`);
    await expect(page.getByTestId("since-day-one")).toHaveText(/\+14 vs your first session/);
    await page.goto(`/sessions/${ids[0]}`);
    await expect(page.getByText("Your starting score")).toBeVisible();
    await expect(page.getByTestId("starting-assessment")).toHaveCount(0);
  });
});
