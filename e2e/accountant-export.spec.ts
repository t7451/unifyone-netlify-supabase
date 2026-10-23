import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const makeReport = (empty = false, manyExpenses = false) => ({
  year: 2026,
  generatedAt: "2026-10-23T12:00:00Z",
  irsMileageRate: null,
  mileageRatePeriods: [
    {
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      rateCents: 72.5,
      label: "January–June 2026",
    },
    {
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      rateCents: 76,
      label: "July–December 2026",
    },
  ],
  summary: {
    shiftCount: empty ? 0 : 2,
    totalGrossDollars: empty ? 0 : 130,
    totalTipsDollars: empty ? 0 : 15,
    totalBonusesDollars: empty ? 0 : 5,
    totalEarningsDollars: empty ? 0 : 150,
    totalMiles: empty ? 0 : 20,
    mileageDeductionDollars: empty ? 0 : 14.5,
    netEarningsDollars: 135.5,
  },
  coverage: {
    sources: {
      timer: { count: empty ? 0 : 1, totalDollars: empty ? 0 : 100 },
      manual: { count: empty ? 0 : 1, totalDollars: empty ? 0 : 50 },
      csv: { count: empty ? 0 : 1, totalDollars: empty ? 0 : 50 },
      expenses: {
        count: empty ? 0 : manyExpenses ? 65 : 1,
        totalDollars: empty ? 0 : manyExpenses ? 812.5 : 12.5,
      },
    },
    mileage: {
      count: empty ? 0 : 1,
      totalMiles: empty ? 0 : 20,
      deductionDollars: empty ? 0 : 14.5,
    },
    exclusions: ["Bank deposits and provider activity are not included."],
    warnings: ["Review imported earnings for duplicate work sessions."],
    reconciled: false,
  },
  bookkeeping: {
    recordedIncomeDollars: empty ? 0 : 200,
    recordedExpenseDollars: empty ? 0 : 12.5,
    incomeAfterRecordedExpensesDollars: empty ? 0 : 187.5,
    mileageDeductionDollars: empty ? 0 : 14.5,
    expensesByCategory: [],
  },
  tax: {
    status: "unavailable",
    basisYear: 2025,
    reason: "No applicable complete tax estimate.",
    seTaxDollars: 12345,
    fedIncomeTaxDollars: 12345,
    totalEstimatedTaxDollars: 24690,
    bracketRate: 0.22,
    nextQuarterlyDueDate: "2027-01-15",
    nextQuarter: 4,
  },
  shifts: empty
    ? []
    : [
        {
          source: "timer",
          date: "2026-06-30T12:00:00Z",
          platform: "Timer delivery",
          durationHours: 2,
          grossDollars: 80,
          tipsDollars: 15,
          bonusesDollars: 5,
          totalDollars: 100,
          miles: 20,
          perHourDollars: 50,
        },
        {
          source: "manual",
          date: "2026-07-01T12:00:00Z",
          platform: "  =2+3",
          durationHours: 1,
          grossDollars: 50,
          tipsDollars: 0,
          bonusesDollars: 0,
          totalDollars: 50,
          miles: 0,
          perHourDollars: 50,
        },
      ],
  imports: empty
    ? []
    : [
        {
          id: 1,
          batchId: 12,
          date: "2026-07-01T12:00:00Z",
          platform: "@csv-import",
          grossDollars: 50,
          tipsDollars: 0,
          bonusesDollars: 0,
          totalDollars: 50,
          miles: 0,
          durationHours: null,
        },
      ],
  expenses: empty
    ? []
    : Array.from({ length: manyExpenses ? 65 : 1 }, (_, index) => ({
        id: index + 1,
        date: "2026-07-01",
        category: "fuel",
        amountCents: 1250,
        merchant: '\t=HYPERLINK("https://example.invalid")',
        notes:
          manyExpenses && index === 64
            ? "FINAL-EXPENSE-ROW"
            : "  +expense note",
      })),
  mileageLogs: empty
    ? []
    : [
        {
          date: "2026-06-30T00:00:00Z",
          miles: 20,
          purpose: "-mileage formula",
          deductionDollars: 14.5,
          startAddress: "=from",
          endAddress: "+to",
          rateCents: 72.5,
          includedSeparately: false,
        },
      ],
});
async function mockRecords(
  page: Page,
  options: {
    gate?: "pro" | "starter" | "error" | "missing";
    reportError?: boolean;
    empty?: boolean;
    manyExpenses?: boolean;
    deferReport?: (year: number) => Promise<void>;
  } = {}
) {
  let gateError = options.gate === "error";
  let reportError = !!options.reportError;
  let exports = 0;
  const requestedYears: number[] = [];
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    let status = 200;
    const inputs = JSON.parse(url.searchParams.get("input") ?? "{}");
    const yearForPath = (index: number) =>
      Number(inputs[index]?.json?.year ?? inputs.json?.year ?? 2026);
    for (const [index, path] of paths.entries())
      if (path === "moneyManager.exportTaxReport") {
        requestedYears.push(yearForPath(index));
        await options.deferReport?.(yearForPath(index));
      }
    const results = paths.map((path, index) => {
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
          totalEarnings: 150,
          totalMiles: 20,
          totalShifts: 2,
          totalHours: 3,
          avgPerHour: 50,
          taxDeduction: 14.5,
        };
      if (path === "moneyManager.getYTDDeduction")
        data = { ytdMiles: 20, ytdDeduction: 14.5 };
      if (path === "gigWorker.checkFeatureAccess")
        data =
          options.gate === "missing"
            ? null
            : { hasAccess: options.gate !== "starter" };
      if (path === "moneyManager.exportTaxReport") {
        exports++;
        const report = makeReport(options.empty, options.manyExpenses);
        const requestedYear = yearForPath(index);
        data =
          requestedYear === 2025
            ? {
                ...report,
                year: 2025,
                irsMileageRate: 0.7,
                mileageRatePeriods: [
                  {
                    startDate: "2025-01-01",
                    endDate: "2025-12-31",
                    rateCents: 70,
                    label: "2025",
                  },
                ],
                coverage: {
                  ...report.coverage,
                  sources: {
                    ...report.coverage.sources,
                    timer: { count: 1, totalDollars: 75 },
                  },
                },
                shifts: report.shifts.map(row => ({
                  ...row,
                  date: row.date.replace("2026-", "2025-"),
                })),
                imports: report.imports.map(row => ({
                  ...row,
                  date: row.date.replace("2026-", "2025-"),
                })),
                expenses: report.expenses.map(row => ({
                  ...row,
                  date: row.date.replace("2026-", "2025-"),
                })),
                mileageLogs: report.mileageLogs.map(row => ({
                  ...row,
                  date: row.date.replace("2026-", "2025-"),
                })),
              }
            : report;
      }
      if (
        (path === "gigWorker.checkFeatureAccess" && gateError) ||
        (path === "moneyManager.exportTaxReport" && reportError)
      ) {
        status = 500;
        return {
          error: {
            json: {
              message: "Fixture unavailable",
              code: -32603,
              data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
            },
          },
        };
      }
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? results : results[0]
      ),
    });
  });
  return {
    recover: () => {
      gateError = false;
      reportError = false;
    },
    exports: () => exports,
    requestedYears,
  };
}

test("reviews coverage before CSV download and keeps imported income, expenses and mileage separate", async ({
  page,
}) => {
  const fixture = await mockRecords(page);
  await page.goto("/overview");
  expect(fixture.exports()).toBe(0);
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Accountant records · 2026" })
  ).toBeVisible();
  await expect(
    dialog.getByText("1 record · $100.00", { exact: true })
  ).toBeVisible();
  await expect(
    dialog.getByText(/duplicates have not been reconciled/)
  ).toBeVisible();
  await expect(
    dialog.getByText(/not a tax return or a calculated tax bill/)
  ).toBeVisible();
  await expect(dialog.getByText("$12,345.00", { exact: true })).toHaveCount(0);
  const downloadEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download records CSV" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    "unifyone-accountant-records-2026.csv"
  );
  const text = await readFile((await download.path())!, "utf8");
  expect(text).toContain("UnifyOne Accountant Records — 2026");
  expect(text).toContain("2026-01-01 to 2026-06-30: $0.725/mi");
  expect(text).toContain("2026-07-01 to 2026-12-31: $0.76/mi");
  expect(text).toContain(
    "Committed CSV earnings — not reconciled with work sessions"
  );
  expect(text).toContain("Recorded expense ledger — local calendar dates");
  expect(text).toContain(
    "Income minus recorded expenses (unreconciled),$187.50"
  );
  expect(text).toContain("'  =2+3");
  expect(text).toContain("'@csv-import");
  expect(text).toContain("'  +expense note");
  expect(text).toContain("'-mileage formula");
  expect(text).toContain("'=from,'+to");
  expect(text).toContain("0.725,14.50,Included with work session");
  expect(text).not.toContain("Estimated annual tax");
  expect(text).not.toContain("24690");
});

test("PDF download contains all ledger sections and paginates long records", async ({
  page,
}) => {
  await mockRecords(page, { manyExpenses: true });
  await page.goto("/overview");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download records PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(
    "unifyone-accountant-records-2026.pdf"
  );
  const buffer = await readFile((await download.path())!);
  const pdf = buffer.toString("latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  expect(pdf).toContain("FINAL-EXPENSE-ROW");
  expect(pdf).toContain("Committed CSV earnings");
  expect(pdf).toContain("Saved mileage ledger");
  expect(pdf).toContain("USD");
  expect(pdf).not.toContain("Estimated annual tax");
});

test("a failed report can be retried without presenting a zero report", async ({
  page,
}) => {
  const fixture = await mockRecords(page, { reportError: true });
  await page.goto("/overview");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "We could not load your accountant records" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download records CSV" })
  ).toHaveCount(0);
  fixture.recover();
  await page.getByRole("button", { name: "Retry loading records" }).click();
  await expect(
    page.getByRole("button", { name: "Download records CSV" })
  ).toBeVisible();
});

test("empty annual coverage is explicit and remains usable on mobile", async ({
  page,
}) => {
  await mockRecords(page, { empty: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  await expect(
    page.getByText(/No records were found for this year/)
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add missing work or review another year" })
  ).toHaveAttribute("href", "/money-manager");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download records CSV" }).click();
  const text = await readFile((await (await pending).path())!, "utf8");
  expect(text).toContain("No records for this year");
  expect(text).not.toContain("NaN");
});

test("preserves the Pro gate and never requests records for Starter", async ({
  page,
}) => {
  const fixture = await mockRecords(page, { gate: "starter" });
  await page.goto("/overview");
  await expect(
    page.getByRole("link", { name: "Export records · Pro" })
  ).toHaveAttribute("href", "/gig-worker-plans");
  expect(fixture.exports()).toBe(0);
  await expect(
    page.getByRole("button", { name: "Export records", exact: true })
  ).toHaveCount(0);
});

test("shows a readable access error and recovers when retried", async ({
  page,
}) => {
  const fixture = await mockRecords(page, { gate: "error" });
  await page.goto("/overview");
  await expect(
    page.getByText("Records export access could not load.", { exact: true })
  ).toBeVisible();
  expect(fixture.exports()).toBe(0);
  fixture.recover();
  await page.getByRole("button", { name: "Retry export access" }).click();
  await expect(
    page.getByRole("button", { name: "Export records", exact: true })
  ).toBeVisible();
});

test("an incomplete access response does not send a worker to an upgrade paywall", async ({
  page,
}) => {
  const fixture = await mockRecords(page, { gate: "missing" });
  await page.goto("/overview");
  await expect(
    page.getByText("Records export access could not load.", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry export access" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Export records · Pro" })
  ).toHaveCount(0);
  expect(fixture.exports()).toBe(0);
});

test("selects a prior report year and clears stale coverage while it loads", async ({
  page,
}) => {
  let release!: () => void;
  const pendingYear = new Promise<void>(resolve => {
    release = resolve;
  });
  const fixture = await mockRecords(page, {
    deferReport: year => (year === 2025 ? pendingYear : Promise.resolve()),
  });
  await page.goto("/overview");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("1 record · $100.00", { exact: true })
  ).toBeVisible();
  await dialog.getByLabel("Report year", { exact: true }).selectOption("2025");
  await expect(
    dialog.getByText("Loading your annual records and coverage…", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Download records CSV" })
  ).toHaveCount(0);
  await expect(
    dialog.getByText("1 record · $100.00", { exact: true })
  ).toHaveCount(0);
  release();
  await expect(
    dialog.getByRole("heading", {
      name: "Accountant records · 2025",
      exact: true,
    })
  ).toBeVisible();
  await expect(
    dialog.getByText("1 record · $75.00", { exact: true })
  ).toBeVisible();
  expect(fixture.requestedYears).toEqual([2026, 2025]);
  const pendingDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download records CSV" }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe(
    "unifyone-accountant-records-2025.csv"
  );
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain("UnifyOne Accountant Records — 2025");
  expect(csv).toContain("2025-01-01 to 2025-12-31: $0.70/mi");
  expect(csv).not.toContain("UnifyOne Accountant Records — 2026");
});

test("an older in-flight response cannot replace the selected year's coverage", async ({
  page,
}) => {
  let release!: () => void;
  const pendingYear = new Promise<void>(resolve => {
    release = resolve;
  });
  const fixture = await mockRecords(page, {
    deferReport: year => (year === 2026 ? pendingYear : Promise.resolve()),
  });
  await page.goto("/overview");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Loading your annual records and coverage…", {
      exact: true,
    })
  ).toBeVisible();
  await expect.poll(() => fixture.requestedYears).toEqual([2026]);
  await dialog.getByLabel("Report year", { exact: true }).selectOption("2025");
  await expect(
    dialog.getByText("1 record · $75.00", { exact: true })
  ).toBeVisible();
  const staleResponse = page.waitForResponse(
    response =>
      response.url().includes("moneyManager.exportTaxReport") &&
      decodeURIComponent(response.url()).includes('"year":2026')
  );
  release();
  await staleResponse;
  await expect(
    dialog.getByRole("heading", {
      name: "Accountant records · 2025",
      exact: true,
    })
  ).toBeVisible();
  await expect(
    dialog.getByText("1 record · $75.00", { exact: true })
  ).toBeVisible();
  await expect(
    dialog.getByText("1 record · $100.00", { exact: true })
  ).toHaveCount(0);
  expect(fixture.requestedYears).toEqual([2026, 2025]);
});
