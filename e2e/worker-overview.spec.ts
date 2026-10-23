import { expect, test, type Page } from "@playwright/test";

async function workerOverview(
  page: Page,
  variant: "new" | "imported" | "timed" | "active" = "new"
) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const results = paths.map(path => {
      let data: unknown = null;
      if (path === "auth.me")
        data = {
          id: 7,
          tenantId: 1,
          primaryProduct: "gig",
          name: "Taylor Worker",
          role: "user",
          openId: "fixture",
          emailVerified: true,
        };
      if (path === "tenant.list")
        data = [{ id: 1, name: "Test workspace", primaryProduct: "gig" }];
      if (path === "notifications.list" || path === "ai.getSuggestions")
        data = [];
      if (path === "notifications.unreadCount") data = { count: 0 };
      if (path === "moneyManager.getShiftStats")
        data = {
          totalEarnings:
            variant === "imported" || variant === "timed" ? 350 : 0,
          totalMiles: variant === "timed" ? 100 : 0,
          totalShifts: variant === "timed" ? 3 : 0,
          totalHours: variant === "timed" ? 10 : 0,
          avgPerHour: variant === "timed" ? 35 : 0,
          taxDeduction: 0,
        };
      if (path === "moneyManager.getActiveShift" && variant === "active")
        data = {
          id: 99,
          platform: "Client project",
          startTime: "2026-10-23T12:00:00Z",
        };
      if (path === "moneyManager.getYTDDeduction")
        data = { ytdMiles: 100, ytdDeduction: 70, quarterlyEstimate: 9999 };
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? results : results[0]
      ),
    });
  });
}

test("gives workers a usable way to start before provider linking is available", async ({
  page,
}) => {
  await workerOverview(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: /Start building this week/ })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Track a work session/ })
  ).toHaveAttribute("href", "/gig-command");
  await expect(
    page.getByRole("link", { name: /Add a completed work session/ })
  ).toHaveAttribute("href", "/money-manager?add=work");
  await expect(
    page.getByRole("link", { name: /Preview an earnings import/ })
  ).toHaveAttribute("href", "/money-manager?tab=import");
  await expect(
    page.getByText(/If its earnings are already in an imported statement/)
  ).toBeVisible();
  await expect(page.getByText(/no bank connection required/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /View account connections/ })
  ).toHaveAttribute("href", "/connected-money");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("keeps imported income, unknown hourly pay and tax deductions distinct", async ({
  page,
}) => {
  await workerOverview(page, "imported");
  await page.goto("/overview");
  await expect(page.getByText("$350.00", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/You have earnings, but no recorded work hours this week/)
  ).toBeVisible();
  await expect(page.getByText("$0.00/hr", { exact: true })).toHaveCount(0);
  await expect(page.getByText("$9,999.00", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(
      /It is not money set aside, a refund, or your estimated tax bill/
    )
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Start building this week/ })
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Estimate quarterly taxes", exact: true })
  ).toHaveAttribute("href", "/tools/quarterly-tax-estimator");
});

test("points recorded workers to profitability and expenses without projecting earnings", async ({
  page,
}) => {
  await workerOverview(page, "timed");
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "See what your recorded hours returned" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review recorded work profitability" })
  ).toHaveAttribute("href", "/work-insights");
  await expect(
    page.getByRole("link", { name: /Record a business expense/ })
  ).toHaveAttribute("href", "/work-expenses");
  await expect(
    page.getByRole("button", { name: "Add past work", exact: true })
  ).toBeVisible();
  await expect(page.getByText("$35.00/hr", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Start building this week/ })
  ).toHaveCount(0);
});

test("keeps an active work session ahead of first-entry prompts", async ({
  page,
}) => {
  await workerOverview(page, "active");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Finish the session you started" })
  ).toBeVisible();
  await expect(
    page.getByText("Your Client project session is still active.", {
      exact: false,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to your active session" })
  ).toHaveAttribute("href", "/gig-command");
  await expect(
    page.getByRole("button", { name: "Continue your session", exact: false })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Start building this week/ })
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});
