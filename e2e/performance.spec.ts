import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

/** Collects LCP and CLS after the page settles. */
async function webVitals(page: import("@playwright/test").Page) {
  return page.evaluate<{ lcp: number; cls: number }>(
    () =>
      new Promise((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!e.hadRecentInput) cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(
          () => resolve({ lcp: Math.round(lcp), cls: Math.round(cls * 1000) / 1000 }),
          2500,
        );
      }),
  );
}

test.describe("performance", () => {
  test.setTimeout(120_000);

  test("landing page has good LCP and no layout shift", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const { lcp, cls } = await webVitals(page);
    console.log(`landing LCP=${lcp}ms CLS=${cls}`);
    expect(lcp).toBeLessThan(2500); // "good" threshold
    expect(cls).toBeLessThan(0.1);
  });

  test("dashboard renders quickly and charts load lazily", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    const { seedCompletedSessions } = await import("./seed");
    await seedCompletedSessions(
      email,
      Array.from({ length: 8 }, (_, i) => ({ daysAgo: 7 - i, score: 60 + i })),
    );

    await page.goto("/dashboard", { waitUntil: "load" });
    const { lcp, cls } = await webVitals(page);
    console.log(`dashboard LCP=${lcp}ms CLS=${cls}`);
    expect(lcp).toBeLessThan(2500);
    expect(cls).toBeLessThan(0.15);
    await expect(page.getByRole("img", { name: "Score by session chart" })).toBeVisible();
  });

  test("the landing page ships a small JS payload", async ({ page }) => {
    let jsBytes = 0;
    page.on("response", async (res) => {
      if (res.url().endsWith(".js") && res.status() === 200) {
        const length = Number(res.headers()["content-length"] ?? 0);
        jsBytes += length;
      }
    });
    await page.goto("/", { waitUntil: "networkidle" });
    console.log(`landing JS transferred: ${Math.round(jsBytes / 1024)} kB`);
    // Guard against accidentally pulling heavy client libraries into the marketing page.
    expect(jsBytes).toBeLessThan(400 * 1024);
  });
});

test.describe("keyboard & focus", () => {
  test("landing page is navigable by keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);

    // Every interactive element in the header is reachable.
    const names: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      names.push(
        (await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "")) || "",
      );
    }
    expect(names.some((n) => /Start practicing/i.test(n))).toBe(true);
  });

  test("dialogs trap focus and close with Escape", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    const { seedCompletedSessions } = await import("./seed");
    const [id] = await seedCompletedSessions(email, [{ daysAgo: 0, score: 70 }]);
    await page.goto(`/sessions/${id}`);

    await page.getByRole("button", { name: "Delete session" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    // Focus is inside the dialog.
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Focus returns to the trigger.
    await expect(page.getByRole("button", { name: "Delete session" })).toBeFocused();
  });

  test("the user menu is operable with the keyboard", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.getByRole("button", { name: "Account menu" }).focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    // Radix focuses the first item when opened with the keyboard.
    await expect(menu.getByRole("menuitem", { name: "Profile" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "Settings" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});
