import { expect, test } from "./fixtures";
import { signUpAndOnboard } from "./helpers";

test.describe("security", () => {
  test("sets protective headers on every page", async ({ page }) => {
    const res = await page.goto("/");
    const headers = res!.headers();
    const csp = headers["content-security-policy"];
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=(self)");
  });

  test("dynamically rendered pages use a nonce-locked script policy", async ({ page }) => {
    const res = await page.goto("/sign-in");
    const csp = res!.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src [^;]*'nonce-/);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    // Next applies that nonce to its own scripts.
    expect(await page.locator("script[nonce]").count()).toBeGreaterThan(0);
    // A fresh nonce per request.
    const second = await page.request.get("/sign-in");
    expect(second.headers()["content-security-policy"]).not.toBe(csp);
  });

  test("no CSP violations across the app", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/content security policy/i.test(m.text())) violations.push(m.text());
    });
    const { seedCompletedSessions } = await import("./seed");
    const { email } = await signUpAndOnboard(page);
    const [sessionId] = await seedCompletedSessions(email, [{ daysAgo: 0, score: 71 }]);
    for (const path of [
      "/",
      "/dashboard",
      "/practice",
      `/sessions/${sessionId}`,
      "/progress",
      "/settings",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("load");
      await page.waitForTimeout(600);
    }
    expect(violations).toEqual([]);
  });

  test("protects API routes from unauthenticated access", async ({ request }) => {
    for (const [method, path] of [
      ["GET", "/api/account/export"],
      ["POST", "/api/topics/random"],
      ["POST", "/api/sessions"],
    ] as const) {
      const res = await request.fetch(path, { method, data: method === "POST" ? {} : undefined });
      expect(res.status(), `${method} ${path}`).toBe(401);
    }
  });

  test("validates request bodies", async ({ page }) => {
    await signUpAndOnboard(page);
    const bad = await page.request.post("/api/sessions", {
      data: {
        topicId: "x",
        mode: "NOT_A_MODE",
        difficulty: "EASY",
        targetDurationSec: 61,
        withVideo: "yes",
      },
    });
    expect(bad.status()).toBe(400);
    const body = await bad.json();
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.fieldErrors).toBeTruthy();

    const notJson = await page.request.post("/api/topics/random", {
      headers: { "Content-Type": "application/json" },
      data: "not json at all",
    });
    expect(notJson.status()).toBe(400);
  });

  test("does not leak internals in error responses", async ({ page }) => {
    await signUpAndOnboard(page);
    const res = await page.request.get("/api/sessions/doesnotexist123");
    expect(res.status()).toBe(404);
    const text = await res.text();
    expect(text).not.toMatch(/prisma|stack|at .*\(/i);
  });

  test("session cookie is not readable from JavaScript", async ({ page }) => {
    await signUpAndOnboard(page);
    expect(await page.evaluate(() => document.cookie)).not.toContain("cc_session");
  });
});
