import { expect, freshClientHeaders, test } from "./fixtures";

import {
  completeOnboarding,
  PASSWORD,
  signIn,
  signOut,
  signUp,
  signUpAndOnboard,
  uniqueEmail,
} from "./helpers";

test.describe("authentication", () => {
  test("sign up → onboarding → dashboard → sign out → sign in", async ({ page, context }) => {
    const { email } = await signUp(page, { name: "Casey Speaker" });

    // Session cookie must be HttpOnly (not readable by page JS).
    const cookie = (await context.cookies()).find((c) => c.name.endsWith("cc_session"));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("cc_session");

    // Un-onboarded users are sent to onboarding from app pages.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding$/);

    await completeOnboarding(page);
    await expect(page.getByRole("heading", { name: "Welcome, Casey" })).toBeVisible();

    await signOut(page);
    await expect(page.getByText("You've been signed out.")).toBeVisible();

    // Logged-out cookie can't reach the dashboard.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);

    await signIn(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("protected routes redirect to sign-in and return afterwards", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await signOut(page);

    await page.goto("/settings/profile");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings%2Fprofile/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
  });

  test("a forged session cookie is rejected server-side", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "cc_session", value: "forged-token-value", url: baseURL! }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("invalid credentials show a generic error", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await signOut(page);
    await signIn(page, email, "definitely wrong password");
    await expect(
      page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
    ).toBeVisible();
    // Email is preserved, password is cleared.
    await expect(page.getByLabel("Email")).toHaveValue(email);

    await signIn(page, uniqueEmail("ghost"), PASSWORD);
    await expect(
      page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
    ).toBeVisible();
  });

  test("duplicate email is reported on the email field", async ({ page, browser }) => {
    const email = uniqueEmail("dupe");
    await signUp(page, { email });

    const otherContext = await browser.newContext({ extraHTTPHeaders: freshClientHeaders() });
    const other = await otherContext.newPage();
    await other.goto("/sign-up");
    await other.getByLabel("Name").fill("Someone Else");
    await other.getByLabel("Email").fill(email.toUpperCase());
    await other.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await other.getByRole("button", { name: "Create account" }).click();
    await expect(other.getByText(/An account with this email already exists/)).toBeVisible();
    await expect(other.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await otherContext.close();
  });

  test("password requirements are enforced with field-level errors", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Short Pass");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("open redirects via ?next are ignored", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await signOut(page);
    await page.goto("/sign-in?next=https://evil.example.com");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
  });

  test("cross-origin API mutations are blocked", async ({ request }) => {
    const res = await request.post("/api/anything", {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.status()).toBe(403);
  });
});
