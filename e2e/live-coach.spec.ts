import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

/**
 * Replaces the browser's speech recognition with a fake that "hears" a
 * sentence full of fillers, so the live coach can be tested without audio.
 */
const FAKE_RECOGNITION = `
  class FakeRecognition {
    constructor() { this.onresult = null; this.onend = null; this.onerror = null; }
    start() {
      setTimeout(() => {
        this.onresult && this.onresult({
          resultIndex: 0,
          results: [Object.assign([{ transcript: "um so I think we should um basically like ship it this week" }], { isFinal: true })],
        });
      }, 300);
    }
    stop() {}
  }
  window.webkitSpeechRecognition = FakeRecognition;
  window.SpeechRecognition = FakeRecognition;
`;

test.describe("live coach", () => {
  test.setTimeout(90_000);

  test("shows filler words while recording when turned on", async ({ page }) => {
    await page.addInitScript(FAKE_RECOGNITION);
    await signUpAndOnboard(page);
    await page.goto("/practice");
    await page.getByRole("radio", { name: "30 sec", exact: true }).click();
    const camera = page.getByRole("switch", { name: "Camera" });
    if ((await camera.getAttribute("aria-checked")) === "true") await camera.click();
    await page.getByRole("button", { name: "Pick a random topic" }).click();
    await page.getByRole("button", { name: "Start speaking" }).click();

    await expect(page.getByText("Microphone ready")).toBeVisible();
    const toggle = page.getByRole("switch", { name: /Live coach/ });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("recording-indicator")).toBeVisible({ timeout: 6000 });

    const panel = page.getByTestId("live-coach");
    await expect(panel).toBeVisible();
    // "um" ×2, "basically", "like" (and "so" at the start) are counted live.
    await expect(panel.getByText(/um ×2/)).toBeVisible({ timeout: 5000 });

    // The choice is remembered for the next session.
    expect(await page.evaluate(() => localStorage.getItem("live-coach-enabled"))).toBe("1");
  });
});
