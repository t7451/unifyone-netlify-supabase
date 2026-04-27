import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("page title contains UnifyOne", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/UnifyOne/i);
  });

  test("hero headline is visible", async ({ page }) => {
    await page.goto("/");
    // The hero section is rendered with a scroll-reveal ref; wait for it
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    // Check for a prominent heading in the hero area
    const heading = page.locator("h1, h2").first();
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
