import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page has nav links", async ({ page }) => {
    await page.goto("/");
    // At least one nav link should exist
    const navLinks = page.locator("nav a");
    await expect(navLinks.first()).toBeVisible();
  });

  test("blog page loads without error", async ({ page }) => {
    const response = await page.goto("/blog");
    // Should not return 5xx
    expect(response?.status()).toBeLessThan(500);
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("pricing page is reachable from the home nav", async ({ page }) => {
    await page.goto("/");
    // The public header nav links to the dedicated /pricing page.
    await page
      .getByRole("link", { name: /^pricing$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("brand link navigates back to home", async ({ page }) => {
    await page.goto("/blog");
    await page
      .getByRole("link", { name: /unifyone/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/$/);
  });
});
