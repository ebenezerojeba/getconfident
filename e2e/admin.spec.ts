import { expect, test } from "./fixtures";
import { completeOnboarding, PASSWORD, signIn, signUpAndOnboard } from "./helpers";

/** Must match ADMIN_EMAILS in playwright.config.ts. */
const ADMIN_EMAIL = "admin-e2e@example.com";

test.describe("admin dashboard", () => {
  test.setTimeout(90_000);

  test("is invisible to regular users", async ({ page }) => {
    await signUpAndOnboard(page);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Admin" })).toHaveCount(0);
  });

  test("shows business metrics to listed admins", async ({ page }) => {
    // The test database persists between runs: sign up the first time, sign in after.
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Admin E2E");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/(onboarding|sign-up)/);
    if (page.url().includes("/onboarding")) {
      await completeOnboarding(page);
    } else {
      await signIn(page, ADMIN_EMAIL);
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
      if (page.url().includes("/onboarding")) await completeOnboarding(page);
    }

    await page.getByRole("link", { name: "Admin" }).first().click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Admin", level: 1 })).toBeVisible();
    for (const text of ["Total users", "Weekly practising users", "Funnel", "Recent failures"]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }

    // Users table: search finds the admin's own account.
    await page.getByLabel("Search users").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=admin-e2e/);
    await expect(page.getByRole("cell", { name: ADMIN_EMAIL })).toBeVisible();
  });

  test("redirects signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin/);
  });
});
