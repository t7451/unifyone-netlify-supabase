import { expect, test, type Page } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });

async function mockWorkSession(
  page: Page,
  failFirstSave = false,
  initialActive: Record<string, unknown> | null = null
) {
  let active: Record<string, unknown> | null = initialActive;
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
  return {
    starts,
    finishes,
    replaceActive: (next: Record<string, unknown> | null) => {
      active = next;
    },
  };
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
  await page.getByLabel("Business miles", { exact: true }).fill("1.234");
  await page.getByRole("button", { name: "Save and end shift" }).click();
  expect(calls.finishes).toHaveLength(0);
  await page.getByLabel("Business miles", { exact: true }).fill("12.5");
  await page.getByLabel("Tips ($)", { exact: true }).fill("20");
  await page.getByLabel("Bonuses ($)", { exact: true }).fill("5");
  await expect(page.getByText("$125.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save and end shift" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "The save could not be confirmed" })
  ).toBeVisible();
  await expect(page.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "100"
  );
  await expect(page.getByText("DoorDash shift in progress")).toBeVisible();
  await expect(page.getByLabel("Base pay ($)", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Date these business miles were driven")
  ).toBeDisabled();
  await page.getByRole("button", { name: "Retry same shift save" }).click();
  await expect(
    page.getByRole("button", { name: "Start Shift", exact: true })
  ).toBeVisible();
  expect(calls.finishes[1]).toMatchObject({
    grossEarnings: 100,
    tips: 20,
    bonuses: 5,
    totalMiles: 12.5,
  });
  expect(calls.finishes[1]).toEqual(calls.finishes[0]);
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

test("restored overnight work preserves its selected local mileage date on an uncertain retry", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-01T05:30:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls = await mockWorkSession(page, true, {
    id: 44,
    platform: "Overnight delivery",
    startTime: "2026-07-01T04:00:00Z",
    status: "active",
  });
  await page.goto("/gig-command");
  await expect(
    page.getByText("1:30:00", { exact: true }).first()
  ).toBeVisible();
  await page.getByRole("button", { name: "End Shift", exact: true }).click();
  await page.getByLabel("Base pay ($)", { exact: true }).fill("40");
  await page.getByLabel("Business miles", { exact: true }).fill("2");
  const date = page.getByLabel("Date these business miles were driven");
  const localDate = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await expect(date).toHaveValue(localDate);
  await page
    .getByRole("button", { name: "Save and end shift", exact: true })
    .click();
  await expect(date).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry same shift save", exact: true })
    .click();
  await expect.poll(() => calls.finishes.length).toBe(2);
  expect(calls.finishes[0]).toEqual(calls.finishes[1]);
  expect(calls.finishes[1]).toMatchObject({
    shiftId: 44,
    mileageDate: localDate,
    grossEarnings: 40,
    totalMiles: 2,
  });
});

test("a different server-side active shift resets the old draft and elapsed timer", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-07-01T12:00:00Z") });
  const calls = await mockWorkSession(page, false, {
    id: 44,
    platform: "First project",
    startTime: "2026-07-01T10:00:00Z",
    status: "active",
  });
  await page.goto("/gig-command");
  await page.getByRole("button", { name: "End Shift", exact: true }).click();
  await page.getByLabel("Base pay ($)", { exact: true }).fill("123");
  calls.replaceActive({
    id: 45,
    platform: "New project",
    startTime: "2026-07-01T12:00:00Z",
    status: "active",
  });
  await page.clock.fastForward(31000);
  await expect(
    page.getByText("New project shift in progress", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Finish and save your shift", { exact: true })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "End Shift", exact: true }).click();
  await expect(page.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    ""
  );
});

test("a late GPS fix cannot reactivate tracking after Stop GPS", async ({
  page,
}) => {
  await mockWorkSession(page);
  await page.route("https://**", route => route.abort());
  await page.goto("/gig-command");
  await page.evaluate(() => {
    const state = window as unknown as {
      lateGPS?: (position: {
        coords: { latitude: number; longitude: number };
      }) => void;
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: (success: typeof state.lateGPS) => {
          state.lateGPS = success;
          return 77;
        },
        clearWatch: () => {},
      },
    });
  });
  await page.getByRole("button", { name: "Start Shift", exact: true }).click();
  await page.getByRole("button", { name: "Enable GPS", exact: true }).click();
  await expect(
    page.getByText("Waiting for permission / location…", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop GPS", exact: true }).click();
  await page.evaluate(() => {
    const state = window as unknown as {
      lateGPS?: (position: {
        coords: { latitude: number; longitude: number };
      }) => void;
    };
    state.lateGPS?.({ coords: { latitude: 47.6, longitude: -122.3 } });
  });
  await expect(
    page.getByText("Off · manual mileage", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable GPS", exact: true })
  ).toBeVisible();
});
