import { expect, test } from "./fixtures";
import { signOut, signUpAndOnboard } from "./helpers";
import { seedCompletedSessions } from "./seed";

test.describe("share result", () => {
  test.setTimeout(90_000);

  test("owner gets a results image; others don't", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    const [sessionId] = await seedCompletedSessions(email, [{ daysAgo: 0, score: 82 }]);

    await page.goto(`/sessions/${sessionId}`);
    await expect(page.getByRole("button", { name: "Share result" })).toBeVisible();

    const res = await page.request.get(`/api/sessions/${sessionId}/share-card`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    expect((await res.body()).byteLength).toBeGreaterThan(10_000);

    await signOut(page);
    await signUpAndOnboard(page);
    const other = await page.request.get(`/api/sessions/${sessionId}/share-card`);
    expect(other.status()).toBe(404);
  });
});
