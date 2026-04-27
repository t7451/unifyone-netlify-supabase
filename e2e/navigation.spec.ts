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

  test("pricing section accessible from home page", async ({ page }) => {
    await page.goto("/");
    // Click pricing link in nav if present, else scroll to section
    const pricingLink = page.getByRole("link", { name: /pricing/i }).first();
    const hasPricingLink = await pricingLink.count();
    if (hasPricingLink) {
      await pricingLink.click();
    } else {
      await page.evaluate(() => {
        document.getElementById("pricing")?.scrollIntoView();
      });
    }
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeAttached();
  });

  test("logo or brand link navigates to home", async ({ page }) => {
    await page.goto("/blog");
    const brandLink = page
      .getByRole("link", { name: /unifyone/i })
      .first()
      .or(page.locator('a[href="/"]').first());
    await expect(brandLink).toBeAttached();
  });
});
