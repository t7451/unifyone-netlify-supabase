import { expect, test, type Page } from "@playwright/test";

// Synthetic CSV and mocked APIs only. No provider calls or live financial data.
async function mockCsv(
  page: Page,
  mode: "normal" | "uncertain" | "delete-error" | "precondition" = "normal"
) {
  const commits: Record<string, unknown>[] = [];
  const deletes: number[] = [];
  let imported = mode === "precondition";
  let successfulWrites = 0;
  const batch = {
    id: 88,
    platform: "DoorDash",
    fileName: "week.csv",
    rowCount: 1,
    totalDollars: 105,
    createdAt: "2026-10-01T12:00:00Z",
    status: "committed",
  };
  const failure = (path: string) => ({
    error: {
      json: {
        message: "Synthetic response lost",
        code: -32603,
        data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
      },
    },
  });
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
            totalEarnings: imported ? 105 : 0,
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
          data = null;
          break;
        case "moneyManager.getMileageSummary":
          data = { totalMiles: 0, totalDeduction: 0, logs: [] };
          break;
        case "moneyManager.listRules":
        case "moneyManager.listEnvelopes":
          data = [];
          break;
        case "moneyManager.listImportBatches":
          data = imported ? [batch] : [];
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
        case "moneyManager.commitEarningsImport": {
          commits.push(args);
          if (mode === "precondition" && imported)
            return {
              error: {
                json: {
                  message:
                    "An older import is incomplete. Review and undo that import before trying this CSV again.",
                  code: -32012,
                  data: { code: "PRECONDITION_FAILED", httpStatus: 412, path },
                },
              },
            };
          const duplicate = imported;
          if (!duplicate) successfulWrites++;
          imported = true;
          if (mode === "uncertain" && commits.length === 1)
            return failure(path);
          data = {
            batchId: 88,
            inserted: duplicate ? 0 : 1,
            duplicate,
            status: duplicate ? "duplicate" : "committed",
            rowCount: 1,
            totalDollars: 105,
          };
          break;
        }
        case "moneyManager.deleteImportBatch": {
          deletes.push(args.batchId);
          const deleted = imported;
          imported = false;
          if (mode === "delete-error" && deletes.length === 1)
            return failure(path);
          data = { deleted };
          break;
        }
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
    commits,
    deletes,
    get successfulWrites() {
      return successfulWrites;
    },
  };
}

async function preview(page: Page) {
  await page.locator("#import-file").setInputFiles({
    name: "week.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("date,earnings,tips\n2026-10-01,100,5"),
  });
  await expect(
    page.getByRole("button", { name: "Save import (1 rows)", exact: true })
  ).toBeEnabled();
}
async function save(page: Page) {
  await page
    .getByRole("button", { name: "Save import (1 rows)", exact: true })
    .click();
}
test("detects a repeated CSV, preserves the total once, and confirms undo before reimport", async ({
  page,
}) => {
  const calls = await mockCsv(page);
  const earnings = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText("Recorded earnings", { exact: true }) });
  await page.goto("/money-manager?tab=import");
  await expect(
    page.getByText("Overlapping earnings in different files or manual", {
      exact: false,
    })
  ).toBeVisible();
  await preview(page);
  await save(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Saved 1 earnings row(s)." })
      .first()
  ).toBeVisible();
  await preview(page);
  await save(page);
  await expect(
    page.getByRole("status").filter({ hasText: "already imported" }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove import week.csv", exact: true })
  ).toHaveCount(1);
  expect(calls.commits).toHaveLength(2);
  await expect(earnings).toContainText("$105.00");
  await page
    .getByRole("button", { name: "Remove import week.csv", exact: true })
    .click();
  await expect(
    page.getByText("Remove these 1 rows", { exact: false })
  ).toContainText("$105.00");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(calls.deletes).toHaveLength(0);
  await page
    .getByRole("button", { name: "Remove import week.csv", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove imported rows", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove import week.csv", exact: true })
  ).toHaveCount(0);
  expect(calls.deletes).toEqual([88]);
  await expect(earnings).toContainText("$0.00");
  await preview(page);
  await save(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Saved 1 earnings row(s)." })
      .first()
  ).toBeVisible();
});
test("locks an uncertain save to the exact file, platform and rows until same-payload retry confirms", async ({
  page,
}) => {
  const calls = await mockCsv(page, "uncertain");
  await page.goto("/money-manager?tab=import");
  await preview(page);
  await save(page);
  await expect(page.getByRole("alert")).toContainText(
    "could not confirm this import"
  );
  await expect(page.locator("#import-file")).toBeDisabled();
  await expect(page.locator("#import-platform")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Retry same import", exact: true })
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some(value => value.includes("week.csv"))
    )
  ).toBe(false);
  await page
    .getByRole("button", { name: "Retry same import", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "already imported" }).first()
  ).toBeVisible();
  expect(calls.commits).toHaveLength(2);
  expect(calls.commits[1]).toEqual(calls.commits[0]);
  await expect(page.locator("#import-file")).toBeEnabled();
});
test("keeps uncertain undo visible and retries only the same batch without permitting a new import", async ({
  page,
}) => {
  const calls = await mockCsv(page, "delete-error");
  await page.goto("/money-manager?tab=import");
  await preview(page);
  await save(page);
  await page
    .getByRole("button", { name: "Remove import week.csv", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove imported rows", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "could not confirm removal"
  );
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true })
  ).toBeDisabled();
  await expect(page.locator("#import-file")).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry removing import", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove import week.csv", exact: true })
  ).toHaveCount(0);
  expect(calls.deletes).toEqual([88, 88]);
  await expect(page.locator("#import-file")).toBeEnabled();
});

test("keeps preview and undo available after a legacy precondition rejection, then imports after confirmed undo", async ({
  page,
}) => {
  const calls = await mockCsv(page, "precondition");
  await page.goto("/money-manager?tab=import");
  await preview(page);
  await save(page);
  await expect(page.getByRole("alert")).toContainText(
    "An older import is incomplete"
  );
  await expect(page.locator("#import-file")).toBeEnabled();
  await expect(page.locator("#import-platform")).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Save import (1 rows)", exact: true })
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Retry same import", exact: true })
  ).toHaveCount(0);
  expect(calls.successfulWrites).toBe(0);
  await page
    .getByRole("button", { name: "Remove import week.csv", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove imported rows", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove import week.csv", exact: true })
  ).toHaveCount(0);
  await save(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Saved 1 earnings row(s)." })
      .first()
  ).toBeVisible();
  expect(calls.deletes).toEqual([88]);
  expect(calls.commits).toHaveLength(2);
  expect(calls.commits[1]).toEqual(calls.commits[0]);
  expect(calls.successfulWrites).toBe(1);
});
