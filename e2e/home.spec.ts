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

  test("Start Free — No Card CTA is visible", async ({ page }) => {
    await page.goto("/");
    // Hero CTA (gig-operator positioning). The same CTA also appears in the
    // final CTA section, so pick the first (hero) instance.
    const cta = page
      .getByRole("link", { name: /Start Free — No Card/i })
      .first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /\/register/);
  });

  test("free calculators secondary CTA links to /tools", async ({ page }) => {
    await page.goto("/");
    const secondary = page
      .getByRole("link", { name: /Try the free calculators/i })
      .first();
    await expect(secondary).toBeVisible();
  });

  test("pricing section exists on the page", async ({ page }) => {
    await page.goto("/");
    const pricing = page.locator("#pricing");
    await expect(pricing).toBeAttached();
  });
});
