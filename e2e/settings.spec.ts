import { expect, test } from "./fixtures";
import { PASSWORD, signIn, signUpAndOnboard } from "./helpers";

test.describe("settings", () => {
  test.setTimeout(90_000);

  test("saves practice preferences and applies them to the practice screen", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");
    await page.getByLabel("Default mode").selectOption("DEBATE");
    await page.getByLabel("Default difficulty").selectOption("HARD");
    await page.getByLabel("Preferred timer").selectOption("300");
    await page.getByLabel("Language").selectOption("fr");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Practice preferences saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Default mode")).toHaveValue("DEBATE");
    await expect(page.getByLabel("Language")).toHaveValue("fr");

    // Defaults flow into a fresh practice setup (sessionStorage is per-context).
    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/practice");
    await expect(page.getByRole("radio", { name: "Debate" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("radio", { name: "5 min", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("theme preference is saved to the account and applied", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");
    await page.getByLabel("Theme", { exact: true }).selectOption("DARK");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Save" }).nth(1).click();
    await expect(page.getByText("Theme saved for this account.")).toBeVisible();

    // A different browser context (no local storage) still gets dark mode.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("notification and privacy preferences persist", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/settings");
    await page.getByRole("switch", { name: "Daily practice reminder" }).click();
    await page.getByLabel("Reminder time").selectOption("7");
    await page.getByRole("button", { name: "Save" }).nth(2).click();
    await expect(page.getByText("Notification preferences saved.")).toBeVisible();

    await page.getByRole("switch", { name: "Keep my recordings" }).click();
    await page.getByRole("button", { name: "Save" }).nth(3).click();
    await expect(page.getByText("Privacy preferences saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("switch", { name: "Daily practice reminder" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByLabel("Reminder time")).toHaveValue("7");
    await expect(page.getByRole("switch", { name: "Keep my recordings" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("exports account data as JSON", async ({ page }) => {
    const { email, name } = await signUpAndOnboard(page);
    const res = await page.request.get("/api/account/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toContain("attachment");
    const data = await res.json();
    expect(data.profile.email).toBe(email.toLowerCase());
    expect(data.profile.name).toBe(name);
    expect(data).toHaveProperty("sessions");
    expect(data).toHaveProperty("achievements");
    // Secrets are never exported.
    expect(JSON.stringify(data)).not.toContain("passwordHash");
    expect(JSON.stringify(data)).not.toContain("argon2");
  });

  test("account deletion requires password + confirmation, then removes everything", async ({
    page,
  }) => {
    const { email } = await signUpAndOnboard(page);
    const { seedCompletedSessions } = await import("./seed");
    await seedCompletedSessions(email, [{ daysAgo: 0, score: 70 }]);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("button", { name: "Permanently delete" })).toBeDisabled();

    await dialog.getByLabel("Your password").fill("the wrong password");
    await dialog.getByLabel(/Type/).fill("DELETE MY ACCOUNT");
    await dialog.getByRole("button", { name: "Permanently delete" }).click();
    await expect(dialog.getByText("That password is incorrect.")).toBeVisible();

    await dialog.getByLabel("Your password").fill(PASSWORD);
    await dialog.getByRole("button", { name: "Permanently delete" }).click();
    await expect(page).toHaveURL(/\/\?deleted=1$/);

    // The account is gone: the old credentials no longer work.
    await signIn(page, email);
    await expect(
      page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
    ).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("notifications", () => {
  test("in-app bell shows unread achievement notifications and marks them read", async ({
    page,
  }) => {
    const { seedCompletedSessions } = await import("./seed");
    const { email } = await signUpAndOnboard(page);
    await seedCompletedSessions(email, [{ daysAgo: 0, score: 80 }]);
    // Visiting achievements reconciles unlocks and creates notifications.
    await page.goto("/achievements");
    await expect(page.getByTestId("achievement-FIRST_PRACTICE")).toHaveAttribute(
      "data-unlocked",
      "true",
    );

    await page.reload();
    await expect(page.getByTestId("unread-count")).toHaveText("1");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByRole("menu").getByText(/Achievement unlocked/)).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("unread-count")).toHaveCount(0);
  });

  test("the cron endpoint requires its secret", async ({ request }) => {
    expect((await request.get("/api/cron/notifications")).status()).toBe(401);
    const res = await request.get("/api/cron/notifications", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status()).toBe(401);
  });
});
