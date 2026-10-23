import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });

type WorkRow = {
  id: number;
  entrySource: "manual" | "timer";
  status: "completed";
  platform: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  grossEarnings: string;
  tips: string;
  bonuses: string;
  totalMiles: string;
  clientReference?: string;
};
async function mockWork(page: Page, uncertainFirstSave = false) {
  const created: Record<string, unknown>[] = [];
  const removed: number[] = [];
  const mileageSaves: Record<string, unknown>[] = [];
  const timedMutations: string[] = [];
  const rows: WorkRow[] = [
    {
      id: 90,
      entrySource: "timer",
      status: "completed",
      platform: "Existing timed work",
      startTime: "2026-10-01T12:00:00Z",
      endTime: "2026-10-01T13:00:00Z",
      durationMinutes: 60,
      grossEarnings: "50",
      tips: "0",
      bonuses: "0",
      totalMiles: "0",
    },
  ];
  const references = new Map<string, number>();
  let nextId = 100;
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
            totalEarnings: 50,
            totalMiles: 0,
            totalShifts: rows.length,
            totalHours: 1,
            avgPerHour: 50,
            taxDeduction: 0,
          };
          break;
        case "moneyManager.listShifts":
          data = { shifts: rows, total: rows.length };
          break;
        case "moneyManager.getActiveShift":
          data = {
            id: 42,
            platform: "Uber",
            startTime: new Date().toISOString(),
            status: "active",
          };
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
          data = { quarterly: { quarterlyPaymentCents: 0 } };
          break;
        case "gigWorker.checkFeatureAccess":
          data = { hasAccess: true };
          break;
        case "workRecords.create": {
          created.push({ ...args });
          const reference = String(args.clientReference);
          let id = references.get(reference);
          if (!id) {
            id = nextId++;
            references.set(reference, id);
            rows.unshift({
              id,
              clientReference: reference,
              entrySource: "manual",
              status: "completed",
              platform: String(args.platform),
              startTime: String(args.startedAt),
              endTime: String(args.endedAt),
              durationMinutes:
                (Date.parse(String(args.endedAt)) -
                  Date.parse(String(args.startedAt))) /
                60_000,
              grossEarnings: String(args.grossEarnings),
              tips: String(args.tips),
              bonuses: String(args.bonuses),
              totalMiles: String(args.totalMiles),
            });
          }
          // Simulate a committed request whose response could not be confirmed.
          if (uncertainFirstSave && created.length === 1)
            return {
              error: {
                json: {
                  message: "Response could not be confirmed",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path,
                  },
                },
              },
            };
          data = { id };
          break;
        }
        case "moneyManager.logMileage":
          mileageSaves.push({ ...args });
          data = {
            deductionDollars:
              Number(args.miles) * (args.date === "2026-06-30" ? 0.725 : 0.76),
          };
          break;
        case "workRecords.remove": {
          removed.push(Number(args.recordId));
          const index = rows.findIndex(
            row =>
              row.id === Number(args.recordId) && row.entrySource === "manual"
          );
          if (index >= 0) rows.splice(index, 1);
          data = { removed: true };
          break;
        }
        case "moneyManager.startShift":
        case "moneyManager.endShift":
          timedMutations.push(path);
          data = { id: 42, success: true };
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
  return { created, removed, mileageSaves, timedMutations, rows };
}
async function enterWork(dialog: Locator, name = "Acme client project") {
  await dialog.getByLabel("App, client or project").fill(name);
  await dialog.getByLabel("Started (local time)").fill("2026-10-01T09:00");
  await dialog.getByLabel("Finished (local time)").fill("2026-10-01T11:00");
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("100");
  await dialog.getByLabel("Tips ($)", { exact: true }).fill("20");
  await dialog.getByLabel("Bonuses ($)", { exact: true }).fill("5");
}

test("adds past work with local times, retries one reference, and deletes only confirmed manual entries", async ({
  page,
}) => {
  const calls = await mockWork(page, true);
  await page.goto("/money-manager");
  await page
    .getByRole("button", { name: "Add completed work", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add completed work" });
  await enterWork(dialog);
  await expect(dialog.getByText("$125.00", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(
    dialog
      .getByRole("alert")
      .filter({ hasText: "We could not confirm this save" })
  ).toBeVisible();
  await expect(dialog.getByLabel("App, client or project")).toBeDisabled();
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "100"
  );
  await dialog
    .getByRole("button", { name: "Retry same entry", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.created).toHaveLength(2);
  expect(calls.created[0]).toEqual(calls.created[1]);
  expect(calls.created[0]).toMatchObject({
    platform: "Acme client project",
    startedAt: "2026-10-01T16:00:00.000Z",
    endedAt: "2026-10-01T18:00:00.000Z",
    grossEarnings: 100,
    tips: 20,
    bonuses: 5,
    totalMiles: 0,
  });
  expect(calls.rows.filter(row => row.entrySource === "manual")).toHaveLength(
    1
  );
  await expect(page.getByText("Work session in progress — Uber")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Delete manual entry for Existing timed work",
    })
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Delete manual entry for Acme client project",
    })
    .click();
  await page.getByRole("button", { name: "Keep entry", exact: true }).click();
  expect(calls.removed).toEqual([]);
  await page
    .getByRole("button", {
      name: "Delete manual entry for Acme client project",
    })
    .click();
  await page
    .getByRole("button", { name: "Delete completed entry", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Delete manual entry for Acme client project",
    })
  ).toHaveCount(0);
  expect(calls.removed).toEqual([100]);
  await expect(
    page.getByText("Existing timed work", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add completed work", exact: true })
    .click();
  await enterWork(dialog, "Second client project");
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.created[2].clientReference).not.toBe(
    calls.created[0].clientReference
  );
  expect(calls.timedMutations).toEqual([]);
});

test("mobile manual work validates future/long/invalid entries and keeps details only in page memory", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = await mockWork(page);
  await page.goto("/money-manager?add=work");
  const dialog = page.getByRole("dialog", { name: "Add completed work" });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(
    dialog.getByText("Name the app, client or project (up to 100 characters).")
  ).toBeVisible();
  await enterWork(dialog, "Private test client");
  await dialog.getByLabel("Finished (local time)").fill("2100-10-01T11:00");
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(
    dialog.getByText("Record up to 24 hours at a time.", { exact: false })
  ).toBeVisible();
  await dialog.getByLabel("Started (local time)").fill("2100-10-01T10:00");
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(
    dialog.getByText("Finished work cannot end in the future.")
  ).toBeVisible();
  await enterWork(dialog, "Private test client");
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("-1");
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(
    dialog.getByText(
      "Enter $0–$99,999,999.99, using at most two decimal places."
    )
  ).toBeVisible();
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("0.005");
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  expect(calls.created).toEqual([]);
  await expect(dialog.getByLabel("App, client or project")).toHaveValue(
    "Private test client"
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }).includes(
        "Private test client"
      )
    )
  ).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("keeps a local mileage date across a UTC rate boundary and retries it unchanged", async ({
  page,
}) => {
  const calls = await mockWork(page, true);
  await page.goto("/money-manager");
  await page
    .getByRole("button", { name: "Add completed work", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add completed work" });
  await enterWork(dialog, "June 30 delivery");
  await dialog.getByLabel("Started (local time)").fill("2026-06-30T21:00");
  await dialog.getByLabel("Finished (local time)").fill("2026-06-30T22:00");
  await dialog.getByLabel("Business miles", { exact: true }).fill("25.5");
  await expect(
    dialog.getByLabel("Date these business miles were driven")
  ).toHaveValue("2026-06-30");
  await dialog
    .getByRole("button", { name: "Save completed work", exact: true })
    .click();
  await expect(
    dialog
      .getByRole("alert")
      .filter({ hasText: "We could not confirm this save" })
  ).toBeVisible();
  await expect(
    dialog.getByLabel("Date these business miles were driven")
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Retry same entry", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.created[0]).toEqual(calls.created[1]);
  expect(calls.created[0]).toMatchObject({
    startedAt: "2026-07-01T04:00:00.000Z",
    endedAt: "2026-07-01T05:00:00.000Z",
    mileageDate: "2026-06-30",
    totalMiles: 25.5,
  });
  await page.getByLabel("Miles Driven", { exact: true }).fill("10");
  await page
    .getByLabel("Date these miles were driven", { exact: true })
    .fill("2026-06-30");
  await expect(page.getByText("$7.25", { exact: true })).toBeVisible();
  await page
    .getByLabel("Date these miles were driven", { exact: true })
    .fill("2026-07-01");
  await expect(page.getByText("$7.60", { exact: true })).toBeVisible();
  await page
    .getByLabel("Date these miles were driven", { exact: true })
    .fill("2026-06-30");
  await page
    .getByRole("button", { name: "Save business miles", exact: true })
    .click();
  await expect(page.getByLabel("Miles Driven", { exact: true })).toHaveValue(
    ""
  );
  expect(calls.mileageSaves[0]).toMatchObject({
    miles: 10,
    date: "2026-06-30",
  });
});
