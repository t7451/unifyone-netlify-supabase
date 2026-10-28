import { expect, test, type Page } from "@playwright/test";

async function recordsFixture(page: Page, mileageUnavailable = false) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const responses = paths.map(path => {
      let data: unknown = null;
      if (path === "auth.me")
        data = {
          id: 7,
          tenantId: 1,
          primaryProduct: "gig",
          name: "Example worker",
          role: "user",
          openId: "fixture",
          emailVerified: true,
        };
      if (path === "tenant.list")
        data = [{ id: 1, name: "Example workspace", primaryProduct: "gig" }];
      if (path === "notifications.list") data = [];
      if (path === "notifications.unreadCount") data = { count: 0 };
      if (path === "ai.getSuggestions") data = { suggestions: [] };
      if (path === "moneyManager.listShifts") data = { shifts: [], total: 0 };
      if (path === "moneyManager.getMileageSummary")
        data = { totalMiles: 1122.54, totalDeduction: 812.34, logs: [] };
      if (path === "moneyManager.getShiftStats")
        data = {
          totalEarnings: 250,
          totalMiles: 1122.54,
          totalShifts: 6,
          totalHours: 10,
          avgPerHour: 25,
          taxDeduction: 812.34,
        };
      if (path === "moneyManager.getShiftBreakdown")
        data = {
          byPlatform: [
            { platform: "Delivery", avgPerHour: 25, totalShifts: 6 },
          ],
          byHour: [{ hour: 17, label: "5 PM", avgPerHour: 25, shiftCount: 6 }],
          byDayOfWeek: [],
        };
      if (path === "moneyManager.getYTDDeduction") {
        if (mileageUnavailable)
          return {
            error: {
              json: {
                message: "Mileage unavailable",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
              },
            },
          };
        data = {
          ytdMiles: 1122.54,
          ytdDeduction: 812.34,
          projectedYearlyDeduction: 1300,
          quarterlyEstimate: 325,
          missedDeduction: 1900,
          shouldUpgradePrompt: true,
        };
      }
      if (path === "gigWorker.checkFeatureAccess") data = { hasAccess: false };
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
}

test("keeps actual deduction estimates without invented averages, missed deductions or a fixed rate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await recordsFixture(page);
  await page.goto("/gig-command");
  const widget = page
    .getByText("GigIQ Intelligence", { exact: true })
    .locator("xpath=../../..");
  await expect(widget.getByText("$812.34", { exact: true })).toBeVisible();
  await expect(widget.getByText("$1,300.00", { exact: true })).toBeVisible();
  await expect(widget.getByText("$325.00", { exact: true })).toBeVisible();
  await expect(widget.getByText(/rates vary by date/)).toBeVisible();
  await expect(
    widget.getByText("Projected year-end deduction", { exact: true })
  ).toBeVisible();
  await expect(
    widget.getByText("Quarterly deduction estimate", { exact: true })
  ).toBeVisible();
  await expect(
    widget.getByText(/Basic shift and mileage tracking is free/)
  ).toBeVisible();
  await expect(
    widget.getByRole("link", { name: "Compare Pro" })
  ).toHaveAttribute("href", "/pricing");
  await expect(widget).not.toContainText("3,200");
  await expect(widget).not.toContainText("unclaimed");
  await expect(widget).not.toContainText("$0.70");
  await expect(widget).not.toContainText("2025");
  const header = widget.locator(":scope > div").first();
  expect(
    await header.evaluate(element => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
  await expect(
    widget.getByRole("button", { name: "All", exact: true })
  ).toBeVisible();
});

test("does not turn an unavailable mileage response into a zero deduction", async ({
  page,
}) => {
  await recordsFixture(page, true);
  await page.goto("/gig-command");
  const widget = page
    .getByText("GigIQ Intelligence", { exact: true })
    .locator("xpath=../../..");
  await expect(widget.getByText("Unavailable", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(widget.getByText("$0.00", { exact: true })).toHaveCount(0);
});
