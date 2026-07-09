import { test, expect } from "@playwright/test";

const protectedRoutes = [
  "/dashboard",
  "/products",
  "/orders",
  "/billing",
  "/settings/account",
  "/team",
  "/automations",
  "/money-manager",
  "/ai-assistant",
  "/developer",
] as const;

test.describe("Auth flows", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
  });

  test("signup intent renders on /register", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /create your workspace/i })
    ).toBeVisible();
  });

  test("login form elements are present", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByPlaceholder(/you@yourcompany\.com/i).first();
    await expect(emailInput).toBeVisible();
    const passwordInput = page.getByPlaceholder(/enter your password/i);
    await expect(passwordInput).toBeVisible();
    const submitBtn = page.getByRole("button", { name: /sign in/i }).first();
    await expect(submitBtn).toBeVisible();
  });

  test("visiting /dashboard unauthenticated redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should be redirected to /login (or show login page content)
    await expect(page).toHaveURL(/\/login/);
  });

  for (const route of protectedRoutes) {
    test(`unauthenticated users are redirected from ${route}`, async ({
      page,
    }) => {
      await page.goto(route);

      await expect(page).toHaveURL(url => {
        return (
          url.pathname === "/login" &&
          url.searchParams.get("returnTo") === route
        );
      });
      await expect(
        page.getByRole("heading", { name: /welcome back/i })
      ).toBeVisible();
    });
  }
});
