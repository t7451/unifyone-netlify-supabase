import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("page title contains UnifyOne", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/UnifyOne/i);
  });

  test("hero headline is visible", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible();
  });

  test("Start Free Trial CTA button is visible", async ({ page }) => {
    await page.goto("/");
    const cta = page
      .getByRole("link", { name: /Start Free Trial|Get Started/i })
      .first();
    await expect(cta).toBeVisible();
  });

  test("pricing section exists on the page", async ({ page }) => {
    await page.goto("/");
    const pricing = page.locator("#pricing");
    await expect(pricing).toBeAttached();
  });
});
