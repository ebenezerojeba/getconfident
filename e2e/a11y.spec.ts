import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures";

const PUBLIC_PAGES = ["/", "/sign-in", "/sign-up", "/forgot-password", "/privacy", "/terms"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    for (const path of PUBLIC_PAGES) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
        }));
        expect(summary).toEqual([]);
      });
    }
  });
}

test.describe("accessibility (authenticated pages)", () => {
  test.setTimeout(120_000);
  for (const scheme of ["light", "dark"] as const) {
    test(`app pages have no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      const { signUpAndOnboard } = await import("./helpers");
      const { seedCompletedSessions } = await import("./seed");
      const { email } = await signUpAndOnboard(page);
      const [sessionId] = await seedCompletedSessions(
        email,
        Array.from({ length: 6 }, (_, i) => ({ daysAgo: 5 - i, score: 60 + i * 4 })),
      );
      for (const path of [
        "/dashboard",
        "/practice",
        `/sessions/${sessionId}`,
        "/history",
        "/progress?range=all",
        "/achievements",
        "/settings/profile",
      ]) {
        await page.goto(path);
        await page.waitForLoadState("load");
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const summary = results.violations.map((v) => ({
          path,
          id: v.id,
          nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
        }));
        expect(summary).toEqual([]);
      }
    });
  }
});
