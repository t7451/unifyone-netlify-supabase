import { expect, test, type Page } from "@playwright/test";

// Synthetic UI data only; no production database or provider calls.
async function mockMoney(page: Page, active = false) {
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
          data = { totalMiles: 0, totalDeduction: 0, logs: [] };
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
        case "moneyManager.endShift":
          saved.push(args);
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
