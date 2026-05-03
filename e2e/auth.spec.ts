import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    // Should not be redirected away or show a 500
    await expect(page).not.toHaveURL(/500/);
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("login form elements are present", async ({ page }) => {
    await page.goto("/login");
    // Email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    // Password input
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]'
    );
    await expect(passwordInput).toBeVisible();
    // Submit button
    const submitBtn = page.getByRole("button", {
      name: /sign in|log in|continue/i,
    });
    await expect(submitBtn).toBeVisible();
  });

  test("visiting /dashboard unauthenticated redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should be redirected to /login (or show login page content)
    await expect(page).toHaveURL(/\/login/);
  });
});
