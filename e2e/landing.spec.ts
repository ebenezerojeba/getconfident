import { expect, test } from "./fixtures";

test.describe("landing page", () => {
  test("renders every section with a single h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Speak with confidence");
    for (const name of [
      /Deliberate practice/,
      /From prompt to feedback/,
      /Rehearse the moments/,
      /Honest, specific feedback/,
      /Watch your confidence/,
      /Your next great answer/,
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    // All 10 configured practice modes are listed.
    await expect(page.locator("#modes h3")).toHaveCount(10);
  });

  test("primary CTA leads to sign-up and anchors navigate", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Start practicing free/ }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Practice modes" })
      .click();
    await expect(page).toHaveURL(/#modes$/);
  });

  test("has SEO and Open Graph metadata", async ({ page, request }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Comm Coach/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /impromptu/i);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Comm Coach/,
    );
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toBeTruthy();
    const img = await request.get(new URL(ogImage!).pathname);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toContain("image/png");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );

    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /api/");
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
  });

  test("sets security headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["permissions-policy"]).toContain("microphone=(self)");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 800 } });
    test("has no horizontal overflow", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    });
  });
});
