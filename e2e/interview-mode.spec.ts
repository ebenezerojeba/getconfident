import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";
import { seedCompletedSessions } from "./seed";

/** Records what the "interviewer" says and finishes each line quickly. */
const FAKE_VOICE = `
  window.__spoken = [];
  const synth = {
    speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 300); },
    cancel() {},
    getVoices() { return []; },
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
`;

test.describe("interview mode", () => {
  test.setTimeout(90_000);

  test("asks the question out loud, then records the answer hands-free", async ({ page }) => {
    await page.addInitScript(FAKE_VOICE);
    const { email } = await signUpAndOnboard(page);
    const [sessionId] = await seedCompletedSessions(email, [{ daysAgo: 0, score: 75 }]);

    await page.goto(`/sessions/${sessionId}`);
    const section = page.getByTestId("follow-ups");
    const toggle = section.getByRole("switch", { name: "Interview mode" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await section.getByRole("button", { name: "Ask me a follow-up" }).click();
    const question = page.getByTestId("follow-up-1");
    await expect(question).toBeVisible();

    // The question was spoken, and recording started on its own afterwards.
    await expect(section.getByText("Recording your answer")).toBeVisible({ timeout: 10_000 });
    const spoken = await page.evaluate(
      () => (window as unknown as { __spoken: string[] }).__spoken,
    );
    expect(spoken[0]).toBe((await question.locator("p").first().textContent())?.trim());

    await page.waitForTimeout(1200);
    await section.getByRole("button", { name: "Finish answer" }).click();
    await expect(question.getByText(/\/100/)).toBeVisible({ timeout: 30_000 });
    // The score is read back.
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length),
      )
      .toBe(2);
  });
});
