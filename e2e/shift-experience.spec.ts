import { expect, test, type Page } from "@playwright/test";

async function mockWorkSession(page: Page, failFirstSave = false) {
  let active: Record<string, unknown> | null = null;
  const completed: Record<string, unknown>[] = [];
  const starts: Record<string, unknown>[] = [];
  const finishes: Record<string, unknown>[] = [];
  await page.addInitScript(() => {
    const state = window as unknown as { locationRequests: number };
    state.locationRequests = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: () => {
          state.locationRequests++;
        },
        watchPosition: (
          _success: unknown,
          failure: (error: { code: number; message: string }) => void
        ) => {
          state.locationRequests++;
          setTimeout(
            () => failure({ code: 1, message: "Permission denied" }),
            0
          );
          return 1;
        },
        clearWatch: () => {},
      },
    });
  });
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const body =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : null;
    const responses = paths.map((path, index) => {
      const input = body?.[index]?.json ?? body?.json ?? {};
      let data: unknown = null;
      switch (path) {
        case "auth.me":
          data = {
            id: 7,
            tenantId: 1,
            primaryProduct: "gig",
            name: "Test worker",
            role: "user",
            openId: "fixture",
            emailVerified: true,
          };
          break;
        case "tenant.list":
          data = [{ id: 1, name: "Test workspace", primaryProduct: "gig" }];
          break;
        case "notifications.list":
          data = [];
          break;
        case "notifications.unreadCount":
          data = { count: 0 };
          break;
        case "ai.getSuggestions":
          data = { suggestions: [] };
          break;
        case "moneyManager.getActiveShift":
          data = active;
          break;
        case "moneyManager.listShifts":
          data = { shifts: completed, total: completed.length };
          break;
        case "moneyManager.getMileageSummary":
          data = { totalMiles: 0, totalDeduction: 0, logs: [] };
          break;
        case "moneyManager.getShiftStats":
          data = {
            totalEarnings: 0,
            totalMiles: 0,
            totalShifts: 0,
            totalHours: 0,
            avgPerHour: 0,
            taxDeduction: 0,
          };
          break;
        case "moneyManager.getShiftBreakdown":
          data = { byPlatform: [], byHour: [], byDayOfWeek: [] };
          break;
        case "moneyManager.getYTDDeduction":
          data = {
            ytdMiles: 0,
            ytdDeduction: 0,
            projectedYearlyDeduction: 0,
            quarterlyEstimate: 0,
            missedDeduction: 0,
            shouldUpgradePrompt: false,
          };
          break;
        case "gigWorker.checkFeatureAccess":
          data = { hasAccess: false };
          break;
        case "moneyManager.startShift":
          starts.push(input);
          active = {
            id: 1,
            platform: input.platform,
            startTime: new Date().toISOString(),
            status: "active",
          };
          data = { id: 1, startTime: active.startTime };
          break;
        case "moneyManager.endShift":
          finishes.push(input);
          if (failFirstSave && finishes.length === 1)
            return {
              error: {
                json: {
                  message: "Temporary save failure",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path,
                  },
                },
              },
            };
          completed.push({
            ...active,
            ...input,
            status: "completed",
            durationMinutes: 60,
          });
          active = null;
          data = { success: true, durationMinutes: 60 };
          break;
      }
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  return { starts, finishes };
}

test("manual sessions do not request GPS; invalid and failed saves keep work recoverable", async ({
  page,
}) => {
  const calls = await mockWorkSession(page, true);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/gig-command");
  await expect(
    page.getByRole("heading", { name: "Your work session" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Start Shift", exact: true }).click();
  await expect(page.getByText("DoorDash shift in progress")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { locationRequests: number }).locationRequests
    )
  ).toBe(0);
  await page.getByRole("button", { name: "End Shift", exact: true }).click();
  await page.getByRole("button", { name: "Save and end shift" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter earnings and miles" })
  ).toBeVisible();
  expect(calls.finishes).toHaveLength(0);
  await page.getByLabel("Base pay ($)", { exact: true }).fill("-5");
  await page.getByLabel("Business miles", { exact: true }).fill("12.5");
  await page.getByRole("button", { name: "Save and end shift" }).click();
  expect(calls.finishes).toHaveLength(0);
  await page.getByLabel("Base pay ($)", { exact: true }).fill("0.005");
  await page.getByRole("button", { name: "Save and end shift" }).click();
  expect(calls.finishes).toHaveLength(0);
  await page.getByLabel("Base pay ($)", { exact: true }).fill("100");
  await page.getByLabel("Tips ($)", { exact: true }).fill("20");
  await page.getByLabel("Bonuses ($)", { exact: true }).fill("5");
  await expect(page.getByText("$125.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save and end shift" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "We could not confirm this save" })
  ).toBeVisible();
  await expect(page.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "100"
  );
  await expect(page.getByText("DoorDash shift in progress")).toBeVisible();
  await page.getByRole("button", { name: "Save and end shift" }).click();
  await expect(
    page.getByRole("button", { name: "Start Shift", exact: true })
  ).toBeVisible();
  expect(calls.finishes[1]).toMatchObject({
    grossEarnings: 100,
    tips: 20,
    bonuses: 5,
    totalMiles: 12.5,
  });
  expect(errors).toEqual([]);
});

test("freelancers can name their work and denied GPS stays manual", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = await mockWorkSession(page);
  await page.goto("/gig-command");
  await page.getByLabel("Platform or type of work").click();
  await page
    .getByRole("option", { name: "Client / project", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start Shift", exact: true })
  ).toBeDisabled();
  await page
    .getByLabel("Client, project or platform name")
    .fill("Acme design project");
  await page.getByLabel("Use GPS for this shift (optional)").check();
  await page.getByRole("button", { name: "Start Shift", exact: true }).click();
  await expect(
    page.getByText("Acme design project shift in progress")
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Location permission was declined" })
  ).toBeVisible();
  await expect(page.getByText("Off · manual mileage")).toBeVisible();
  expect(calls.starts).toEqual([{ platform: "Acme design project" }]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  expect(
    await page.evaluate(
      () => (window as unknown as { locationRequests: number }).locationRequests
    )
  ).toBe(1);
});
