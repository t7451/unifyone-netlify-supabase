import { test, expect, type Page } from "@playwright/test";

async function mockPublic(page: Page) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", route => {
    const url = new URL(route.request().url());
    const results = url.pathname
      .split("/api/trpc/")[1]
      .split(",")
      .map(() => ({ result: { data: { json: null } } }));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? results : results[0]
      ),
    });
  });
}
test.beforeEach(async ({ page }) => {
  await mockPublic(page);
});

test("homepage names the product and leads to account creation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/UnifyOne/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const start = page.getByRole("link", { name: "Start your work log" });
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute("href", /\/register/);
});

test("actual product previews load and are identified as sample records", async ({
  page,
}) => {
  await page.goto("/");
  const images = page.locator(".work-front img");
  await expect(images).toHaveCount(2);
  await images.last().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      images.evaluateAll(list =>
        list.every(
          image =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0
        )
      )
    )
    .toBe(true);
  await expect(
    page.getByText("Example workspace · sample records", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(/Actual product screen, sample records/)
  ).toBeAttached();
});

test("the calculator path works without an account", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Just checking a number/ }).click();
  await expect(page).toHaveURL(/\/tools\/gig-hourly-rate$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByLabel("Total earnings ($)", { exact: true }).first()
  ).toBeVisible();
});

test("plan comparison keeps monthly and annual signup choices accurate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Compare plans", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  const pro = page.locator(".marketing-plan").filter({
    has: page.getByRole("heading", { name: "Gig Pro", exact: true }),
  });
  await expect(pro.locator(".marketing-plan-price")).toContainText("$4.99");
  await page.getByRole("button", { name: /Annual/ }).click();
  await expect(pro.locator(".marketing-plan-price")).toContainText("$49");
  await expect(
    pro.getByRole("link", { name: "Choose Pro", exact: true })
  ).toHaveAttribute("href", /period%3Dyearly|period=yearly/);
});

test("mobile navigation is keyboard recoverable and public pages fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  await expect(
    page.getByRole("button", { name: "Close navigation" })
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  for (const path of ["/", "/the-system", "/pricing", "/tools", "/about"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
