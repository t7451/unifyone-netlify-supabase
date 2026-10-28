import { expect, test, type Page } from "@playwright/test";

// Synthetic UI data only; no production database or provider calls.
async function mockMoney(
  page: Page,
  active = false,
  uncertainFinish = false,
  uncertainMileage = false
) {
  let mileageAttempts = 0;
  const mileageLogs: {
    id: number;
    date: string;
    miles: string;
    irsRateCents: string;
    deductionCents: number;
  }[] = [];
  let finishAttempts = 0;
  const saved: unknown[] = [];
  let hasActiveSession = active;
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const input =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : null;
    const responses = paths.map((path, index) => {
      const args = input?.[index]?.json ?? input?.json ?? {};
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
        case "moneyManager.listShifts":
          data = { shifts: [], total: 0 };
          break;
        case "moneyManager.getActiveShift":
          data = hasActiveSession
            ? {
                id: 42,
                platform: "Upwork",
                startTime: "2026-10-23T10:00:00Z",
                status: "active",
              }
            : null;
          break;
        case "moneyManager.getMileageSummary":
          data = { totalMiles: 0, totalDeduction: 0, logs: mileageLogs };
          break;
        case "moneyManager.listRules":
        case "moneyManager.listEnvelopes":
        case "moneyManager.listImportBatches":
          data = [];
          break;
        case "moneyManager.getEnvelopeBalance":
          data = { balanceCents: 0 };
          break;
        case "moneyManager.getTaxEstimate":
          data = { quarterly: { quarterlyPaymentCents: 10000 } };
          break;
        case "gigWorker.checkFeatureAccess":
          data = { hasAccess: true };
          break;
        case "moneyManager.previewEarningsImport":
          data = {
            rows: [
              {
                earnedDate: "2026-10-01T12:00:00Z",
                platform: "DoorDash",
                grossDollars: 100,
                tipsDollars: 5,
                bonusDollars: 0,
                miles: 20,
                rawRow: {},
              },
            ],
            skipped: [{ line: 3, reason: "Missing date", raw: [] }],
            totals: {
              rowCount: 1,
              totalDollars: 105,
              grossDollars: 100,
              tipsDollars: 5,
              bonusDollars: 0,
              miles: 20,
            },
          };
          break;
        case "moneyManager.logMileage":
          saved.push(args);
          mileageAttempts++;
          mileageLogs.push({
            id: mileageAttempts,
            date: `${args.date}T00:00:00Z`,
            miles: String(args.miles),
            irsRateCents: "76.00",
            deductionCents: Math.round(args.miles * 76),
          });
          if (uncertainMileage && mileageAttempts === 1)
            return {
              error: {
                json: {
                  message: "Response lost after saving",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path,
                  },
                },
              },
            };
          data = { deductionCents: 399, deductionDollars: 3.99 };
          break;
        case "moneyManager.endShift":
          saved.push(args);
          finishAttempts++;
          if (uncertainFinish && finishAttempts === 1)
            return {
              error: {
                json: {
                  message: "Response lost after saving",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path,
                  },
                },
              },
            };
          hasActiveSession = false;
          data = { success: true };
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
  return saved;
}

test("CSV fallback opens directly, explains skipped rows, and clears preview when source changes", async ({
  page,
}) => {
  await mockMoney(page);
  await page.goto("/money-manager?tab=import");
  await expect(
    page.getByRole("tab", { name: "Import earnings", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("link", { name: "Download a blank CSV template" })
  ).toBeVisible();
  await page.locator("#import-file").setInputFiles({
    name: "week.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("date,earnings\n2026-10-01,100"),
  });
  await expect(
    page.getByRole("button", { name: "Save import (1 rows)" })
  ).toBeEnabled();
  await page.getByText("Review skipped rows (1)").click();
  await expect(page.getByText("Line 3: Missing date")).toBeVisible();
  await page.locator("#import-platform").click();
  await page.getByRole("option", { name: "Other", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save import (1 rows)" })
  ).toHaveCount(0);
});

test("restores an existing session and requires valid earnings and explicit mileage before saving", async ({
  page,
}) => {
  const saved = await mockMoney(page, true);
  await page.goto("/money-manager");
  await expect(
    page.getByText("Work session in progress — Upwork")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start work session", exact: true })
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", { name: "Save completed session" });
  await expect(save).toBeDisabled();
  await dialog.getByLabel("Base pay, before tips ($)").fill("-1");
  await dialog.getByLabel("Miles Driven").fill("0");
  await expect(save).toBeDisabled();
  await dialog.getByLabel("Base pay, before tips ($)").fill("0");
  await dialog.getByLabel("Tips ($)", { exact: true }).fill("-5");
  await expect(save).toBeDisabled();
  await dialog.getByLabel("Tips ($)", { exact: true }).fill("0");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    shiftId: 42,
    grossEarnings: 0,
    tips: 0,
    bonuses: 0,
    totalMiles: 0,
  });
});

test("virtual envelopes are clearly labeled and negative targets cannot be saved", async ({
  page,
}) => {
  await mockMoney(page);
  await page.goto("/money-manager?tab=envelopes");
  await expect(
    page.getByText("Envelopes are a virtual plan, not bank balances.", {
      exact: false,
    })
  ).toBeVisible();
  await page.getByRole("button", { name: "New Envelope" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Envelope Name").fill("Tax reserve");
  await dialog.getByLabel("Target ($, optional)").fill("-20");
  await expect(
    dialog.getByRole("button", { name: "Create Envelope", exact: true })
  ).toBeDisabled();
  await dialog.getByLabel("Target ($, optional)").fill("200");
  await expect(
    dialog.getByRole("button", { name: "Create Envelope", exact: true })
  ).toBeEnabled();
});

test("rejects precision loss and database-overflow amounts before completing a timer", async ({
  page,
}) => {
  const saved = await mockMoney(page, true);
  await page.goto("/money-manager");
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", { name: "Save completed session" });
  const base = dialog.getByLabel("Base pay, before tips ($)");
  const miles = dialog.getByLabel("Miles Driven");
  await miles.fill("0");
  for (const invalid of ["1.001", "100000000"]) {
    await base.fill(invalid);
    await expect(save).toBeDisabled();
    await expect(base).toHaveAttribute("aria-invalid", "true");
  }
  await base.fill("100");
  await miles.fill("1000000");
  await expect(save).toBeDisabled();
  await miles.fill("0.001");
  await expect(save).toBeDisabled();
  await miles.fill("0");
  await expect(save).toBeEnabled();
  expect(saved).toHaveLength(0);
});

test("mileage and planning targets respect API minimums and integer-cent bounds", async ({
  page,
}) => {
  await mockMoney(page);
  await page.goto("/money-manager");
  const miles = page.locator("#mileage-miles");
  const saveMiles = page.getByRole("button", {
    name: "Save business miles",
    exact: true,
  });
  for (const invalid of ["0.01", "1.001", "1000000"]) {
    await miles.fill(invalid);
    await expect(saveMiles).toBeDisabled();
    await expect(miles).toHaveAttribute("aria-invalid", "true");
  }
  await miles.fill("0.1");
  await expect(saveMiles).toBeEnabled();
  await page.getByRole("tab", { name: "Set-aside plan", exact: true }).click();
  await page.getByRole("button", { name: "New Envelope" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Envelope Name").fill("Work reserve");
  const target = dialog.getByLabel("Target ($, optional)");
  const saveEnvelope = dialog.getByRole("button", {
    name: "Create Envelope",
    exact: true,
  });
  for (const invalid of ["21474836.48", "12.345"]) {
    await target.fill(invalid);
    await expect(saveEnvelope).toBeDisabled();
  }
  await target.fill("21474836.47");
  await expect(saveEnvelope).toBeEnabled();
});

test("uncertain timer completion keeps an exact retry draft even after closing the dialog", async ({
  page,
}) => {
  const saved = await mockMoney(page, true, true);
  await page.goto("/money-manager");
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Base pay, before tips ($)").fill("125.25");
  await dialog.getByLabel("Miles Driven").fill("0");
  await dialog.getByLabel("Notes (optional)").fill("Finished project");
  await dialog
    .getByRole("button", { name: "Save completed session", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("could not confirm");
  await expect(dialog.getByLabel("Base pay, before tips ($)")).toBeDisabled();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Notes (optional)")).toHaveValue(
    "Finished project"
  );
  await dialog
    .getByRole("button", { name: "Retry same completed session", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(saved).toHaveLength(2);
  expect(saved[1]).toEqual(saved[0]);
});

test("uncertain standalone mileage requires refreshed-record review instead of blind resubmission", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const saved = await mockMoney(page, false, false, true);
  await page.goto("/money-manager");
  await page.locator("#mileage-miles").fill("5.25");
  const save = page.getByRole("button", {
    name: "Save business miles",
    exact: true,
  });
  await save.click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "could not confirm this mileage" })
  ).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(page.locator("#mileage-miles")).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Refresh mileage records before retrying",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Saved mileage for .*5.25 miles/)).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(390);
  await expect(save).toBeDisabled();
  await page
    .getByRole("button", {
      name: "These miles are already saved; clear draft",
      exact: true,
    })
    .click();
  await expect(page.locator("#mileage-miles")).toBeEnabled();
  await expect(page.locator("#mileage-miles")).toHaveValue("");
  await expect(save).toBeDisabled();
  expect(saved).toHaveLength(1);
});
