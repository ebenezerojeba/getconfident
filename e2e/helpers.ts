import { expect, type Page } from "@playwright/test";

export const PASSWORD = "e2e speaking passphrase";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signUp(page: Page, { name = "Casey Speaker", email = uniqueEmail() } = {}) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  return { name, email };
}

export async function completeOnboarding(page: Page) {
  await page.getByText("Ace job interviews").click();
  await page.getByText("1 min", { exact: true }).click();
  await page.getByText("Technology").click();
  await page.getByRole("button", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function signUpAndOnboard(page: Page, opts?: { name?: string; email?: string }) {
  const user = await signUp(page, opts);
  await completeOnboarding(page);
  return user;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in\?signedOut=1/);
}
