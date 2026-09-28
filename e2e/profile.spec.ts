import { expect, test } from "./fixtures";
import { PASSWORD, signIn, signOut, signUpAndOnboard } from "./helpers";

test.describe("profile & account security", () => {
  test("updates the display name", async ({ page }) => {
    await signUpAndOnboard(page, { name: "Before Name" });
    await page.goto("/settings/profile");
    await page.getByLabel("Name", { exact: true }).fill("After Name");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back, After/ })).toBeVisible();
  });

  test("changes password and requires the new one to sign in", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await page.goto("/settings/profile");

    await page.getByLabel("Current password").fill("wrong password here");
    await page.getByLabel("New password").fill("a brand new passphrase");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Your current password is incorrect.").first()).toBeVisible();

    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password").fill("a brand new passphrase");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText(/Password updated/)).toBeVisible();

    await signOut(page);
    await signIn(page, email, PASSWORD);
    await expect(
      page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
    ).toBeVisible();
    await signIn(page, email, "a brand new passphrase");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("sign-in attempts are rate limited per account", async ({ page }) => {
    const { email } = await signUpAndOnboard(page);
    await signOut(page);
    for (let i = 0; i < 8; i++) {
      await signIn(page, email, `wrong password ${i}`);
      await expect(
        page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
      ).toBeVisible();
    }
    await signIn(page, email, "wrong password again");
    await expect(
      page.getByRole("alert").filter({ hasText: /Too many sign-in attempts/ }),
    ).toBeVisible();
    // Even the correct password is refused while limited.
    await signIn(page, email, PASSWORD);
    await expect(
      page.getByRole("alert").filter({ hasText: /Too many sign-in attempts/ }),
    ).toBeVisible();
  });
});
