import { expect, test, type Page } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });
const original = {
  id: 101,
  clientReference: "7f858ebd-b0ba-4903-b6a2-d730459b7874",
  platform: "Acme client project",
  startedAt: "2026-07-01T06:30:12.123Z",
  endedAt: "2026-07-01T07:15:48.456Z",
  grossEarnings: "100.00",
  tips: "10.00",
  bonuses: "5.00",
  totalMiles: "20.00",
  mileageDate: "2026-06-30",
  notes: "Original private work note",
  updatedAt: "2026-10-01T12:00:00.123Z",
};
const newVersion = "2026-10-01T12:01:00.456Z";
type Mode = "normal" | "conflict" | "uncertain" | "load-error";
async function mockWork(page: Page, mode: Mode = "normal") {
  let record = { ...original };
  const updates: Record<string, unknown>[] = [];
  const creates: Record<string, unknown>[] = [];
  const gets: Record<string, unknown>[] = [];
  const error = (path: string, code: string, message: string) => ({
    error: {
      json: {
        message,
        code: -32603,
        data: {
          code,
          httpStatus:
            code === "CONFLICT" ? 409 : code === "NOT_FOUND" ? 404 : 500,
          path,
        },
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
        : JSON.parse(url.searchParams.get("input") ?? "{}");
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
        case "moneyManager.listRules":
        case "moneyManager.listEnvelopes":
        case "moneyManager.listImportBatches":
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
            totalEarnings: Number(record.grossEarnings) + 15,
            totalMiles: 20,
            totalShifts: 2,
            totalHours: 1.76,
            avgPerHour: 65,
            taxDeduction: 14.5,
          };
          break;
        case "moneyManager.listShifts":
          data = {
            shifts: [
              {
                id: record.id,
                platform: record.platform,
                entrySource: "manual",
                status: "completed",
                startTime: record.startedAt,
                endTime: record.endedAt,
                durationMinutes: 46,
                grossEarnings: record.grossEarnings,
                tips: record.tips,
                bonuses: record.bonuses,
                totalMiles: record.totalMiles,
              },
              {
                id: 90,
                platform: "Timed delivery work",
                entrySource: "timer",
                status: "completed",
                startTime: "2026-06-30T12:00:00Z",
                endTime: "2026-06-30T13:00:00Z",
                durationMinutes: 60,
                grossEarnings: "50",
                tips: "0",
                bonuses: "0",
                totalMiles: "0",
              },
            ],
            total: 2,
          };
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
          data = { totalMiles: 20, totalDeduction: 14.5, logs: [] };
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
        case "workRecords.get":
          gets.push({ ...args });
          if (mode === "load-error" && gets.length === 1)
            return error(
              path,
              "NOT_FOUND",
              "The saved entry could not be found."
            );
          data = { ...record };
          break;
        case "workRecords.update":
          updates.push({ ...args });
          if (mode === "conflict" && updates.length === 1) {
            record = {
              ...record,
              grossEarnings: "90.00",
              notes: "Newer saved note",
              updatedAt: newVersion,
            };
            return error(
              path,
              "CONFLICT",
              "This entry changed since it was loaded."
            );
          }
          record = {
            ...record,
            grossEarnings: Number(args.grossEarnings).toFixed(2),
            tips: Number(args.tips).toFixed(2),
            bonuses: Number(args.bonuses).toFixed(2),
            totalMiles: Number(args.totalMiles).toFixed(2),
            notes: String(args.notes ?? ""),
            updatedAt: newVersion,
          };
          if (mode === "uncertain" && updates.length === 1)
            return error(
              path,
              "INTERNAL_SERVER_ERROR",
              "The response could not be confirmed."
            );
          data = { id: record.id, updatedAt: record.updatedAt };
          break;
        case "workRecords.create":
          creates.push({ ...args });
          data = { id: 102 };
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
  return { updates, creates, gets };
}
async function openEdit(page: Page) {
  await page.goto("/money-manager");
  await page
    .getByRole("button", {
      name: "Edit manual entry for Acme client project",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit completed work",
    exact: true,
  });
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "100.00"
  );
  return dialog;
}

test("hydrates protected full details and preserves the saved timestamps, mileage date and notes on a pay-only edit", async ({
  page,
}) => {
  const calls = await mockWork(page);
  const dialog = await openEdit(page);
  await expect(
    page.getByRole("button", {
      name: "Edit manual entry for Timed delivery work",
      exact: true,
    })
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Notes (optional)")).toHaveValue(
    original.notes
  );
  await expect(
    dialog.getByLabel("Date these business miles were driven")
  ).toHaveValue("2026-06-30");
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("125.50");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(calls.gets[0]).toEqual({ recordId: 101 });
  expect(calls.updates).toHaveLength(1);
  expect(calls.updates[0]).toEqual({
    recordId: 101,
    expectedUpdatedAt: original.updatedAt,
    platform: original.platform,
    startedAt: original.startedAt,
    endedAt: original.endedAt,
    grossEarnings: 125.5,
    tips: 10,
    bonuses: 5,
    totalMiles: 20,
    mileageDate: original.mileageDate,
    notes: original.notes,
  });
  expect(calls.creates).toHaveLength(0);
  await expect(
    page.getByText("Work session in progress — Uber", { exact: true })
  ).toBeVisible();
});

test("rejects invalid edited pay before sending an update and discards a normal cancelled draft", async ({
  page,
}) => {
  const calls = await mockWork(page);
  const dialog = await openEdit(page);
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("-5");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("highlighted fields");
  expect(calls.updates).toHaveLength(0);
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("500");
  await dialog
    .getByRole("button", { name: "Cancel editing", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit manual entry for Acme client project",
      exact: true,
    })
    .click();
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "100.00"
  );
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some(value =>
        value.includes("Original private work note")
      )
    )
  ).toBe(false);
});

test("keeps stale-version edits visible until the worker explicitly reloads the latest version", async ({
  page,
}) => {
  const calls = await mockWork(page, "conflict");
  const dialog = await openEdit(page);
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("250");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Your unsaved details are still here"
  );
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "250"
  );
  await expect(
    dialog.getByRole("button", { name: "Save changes", exact: true })
  ).toBeDisabled();
  await dialog.getByLabel("Tips ($)", { exact: true }).fill("20");
  await expect(dialog.getByRole("alert")).toContainText(
    "changed since it was loaded"
  );
  await dialog
    .locator("form")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit manual entry for Acme client project",
      exact: true,
    })
    .click();
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "250"
  );
  await expect(dialog.getByRole("alert")).toContainText(
    "changed since it was loaded"
  );
  await dialog
    .getByRole("button", { name: "Review reload options", exact: true })
    .click();
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "250"
  );
  await dialog
    .getByRole("button", { name: "Reload and replace my edits", exact: true })
    .click();
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "90.00"
  );
  await expect(dialog.getByLabel("Notes (optional)")).toHaveValue(
    "Newer saved note"
  );
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("275");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(calls.updates[0].expectedUpdatedAt).toBe(original.updatedAt);
  expect(calls.updates[1].expectedUpdatedAt).toBe(newVersion);
});

test("retries an uncertain update with the exact original version and payload after closing and reopening", async ({
  page,
}) => {
  const calls = await mockWork(page, "uncertain");
  const dialog = await openEdit(page);
  await dialog.getByLabel("Base pay ($)", { exact: true }).fill("150");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "We could not confirm this update"
  );
  await expect(
    dialog.getByLabel("Base pay ($)", { exact: true })
  ).toBeDisabled();
  await dialog
    .locator("form")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit manual entry for Acme client project",
      exact: true,
    })
    .click();
  await expect(dialog.getByLabel("Base pay ($)", { exact: true })).toHaveValue(
    "150"
  );
  await dialog
    .getByRole("button", { name: "Retry same update", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(calls.updates).toHaveLength(2);
  expect(calls.updates[0]).toEqual(calls.updates[1]);
});

test("does not infer missing detail or offer an editable form after a load failure", async ({
  page,
}) => {
  const calls = await mockWork(page, "load-error");
  await page.goto("/money-manager");
  await page
    .getByRole("button", {
      name: "Edit manual entry for Acme client project",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit completed work",
    exact: true,
  });
  await expect(dialog.getByRole("alert")).toContainText("could not be found");
  await expect(
    dialog.getByRole("button", { name: "Save changes", exact: true })
  ).toHaveCount(0);
  expect(calls.updates).toHaveLength(0);
  await dialog
    .getByRole("button", { name: "Retry loading entry", exact: true })
    .click();
  await expect(dialog.getByLabel("Notes (optional)")).toHaveValue(
    original.notes
  );
});
