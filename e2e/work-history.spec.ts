import { expect, test, type Page } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });
type Entry = {
  kind: "manual" | "timer" | "import";
  id: number;
  source: string;
  startedAt: string;
  endedAt: string | null;
  earningsUSD: number;
  base: number;
  tips: number;
  bonuses: number;
  hours: number | null;
  miles: number | null;
  importBatchId: number | null;
};
async function fixture(page: Page, failInitially = false) {
  await page.clock.setFixedTime(new Date("2026-03-10T12:00:00Z"));
  let fail = failInitially;
  const requests: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  let manual = {
    id: 101,
    clientReference: "7f858ebd-b0ba-4903-b6a2-d730459b7874",
    platform: "Acme 100%_client",
    startedAt: "2026-03-08T09:00:00.000Z",
    endedAt: "2026-03-08T09:45:00.000Z",
    grossEarnings: "100.00",
    tips: "10.00",
    bonuses: "5.00",
    totalMiles: "20.00",
    mileageDate: "2026-03-08",
    notes: "Completed client work",
    updatedAt: "2026-03-09T12:00:00.000Z",
  };
  function entries(): Entry[] {
    return [
      {
        kind: "manual",
        id: 101,
        source: manual.platform,
        startedAt: manual.startedAt,
        endedAt: manual.endedAt,
        earningsUSD: Number(manual.grossEarnings) + 15,
        base: Number(manual.grossEarnings),
        tips: 10,
        bonuses: 5,
        hours: 0.75,
        miles: 20,
        importBatchId: null,
      },
      {
        kind: "timer",
        id: 102,
        source: "Rideshare",
        startedAt: "2026-03-09T08:00:00.000Z",
        endedAt: "2026-03-09T09:00:00.000Z",
        earningsUSD: 50,
        base: 50,
        tips: 0,
        bonuses: 0,
        hours: 1,
        miles: 25,
        importBatchId: null,
      },
      {
        kind: "import",
        id: 501,
        source: "Delivery statement",
        startedAt: "2026-03-08T00:00:00.000Z",
        endedAt: null,
        earningsUSD: 150,
        base: 140,
        tips: 10,
        bonuses: 0,
        hours: null,
        miles: null,
        importBatchId: 11,
      },
      ...Array.from(
        { length: 28 },
        (_, index): Entry => ({
          kind: "timer",
          id: 200 + index,
          source: "Rideshare",
          startedAt: "2026-03-05T18:00:00.000Z",
          endedAt: "2026-03-05T19:00:00.000Z",
          earningsUSD: 10,
          base: 10,
          tips: 0,
          bonuses: 0,
          hours: 1,
          miles: 3,
          importBatchId: null,
        })
      ),
    ];
  }
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const input =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : JSON.parse(url.searchParams.get("input") ?? "{}");
    let status = 200;
    const responses = paths.map((path, index) => {
      const args = input?.[index]?.json ?? input?.json ?? {};
      let data: unknown = null;
      if (path === "auth.me")
        data = {
          id: 7,
          tenantId: 1,
          primaryProduct: "gig",
          name: "Test worker",
          role: "user",
          openId: "fixture",
          emailVerified: true,
        };
      if (path === "tenant.list")
        data = [{ id: 1, name: "Test workspace", primaryProduct: "gig" }];
      if (path === "notifications.list") data = [];
      if (path === "notifications.unreadCount") data = { count: 0 };
      if (path === "ai.getSuggestions") data = { suggestions: [] };
      if (path === "workHistory.list") {
        requests.push(args);
        if (fail) {
          status = 500;
          return {
            error: {
              json: {
                message: "History fixture unavailable",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
              },
            },
          };
        }
        const all = entries();
        const filtered = all
          .filter(entry => {
            const dateMatches =
              entry.kind === "import"
                ? entry.startedAt.slice(0, 10) >= args.fromDate &&
                  entry.startedAt.slice(0, 10) < args.beforeDate
                : Date.parse(entry.startedAt) >= Date.parse(args.from) &&
                  Date.parse(entry.startedAt) < Date.parse(args.before);
            return (
              dateMatches &&
              (!args.source || entry.source === args.source) &&
              (!args.query ||
                entry.source.toLowerCase().includes(args.query.toLowerCase()))
            );
          })
          .sort(
            (a, b) =>
              Date.parse(b.startedAt) - Date.parse(a.startedAt) ||
              a.kind.localeCompare(b.kind) ||
              b.id - a.id
          );
        data = {
          entries: filtered.slice(args.offset, args.offset + args.limit),
          totalEntries: filtered.length,
          totalEarningsUSD: filtered.reduce(
            (sum, entry) => sum + entry.earningsUSD,
            0
          ),
          totalRecordedHours: filtered.reduce(
            (sum, entry) => sum + (entry.hours ?? 0),
            0
          ),
          unknownHoursCount: filtered.filter(entry => entry.hours === null)
            .length,
          totalRecordedMiles: filtered.reduce(
            (sum, entry) => sum + (entry.miles ?? 0),
            0
          ),
          unknownMilesCount: filtered.filter(entry => entry.miles === null)
            .length,
          sources: Array.from(new Set(all.map(entry => entry.source))).sort(),
          from: args.from,
          before: args.before,
          limit: args.limit,
          offset: args.offset,
        };
      }
      if (path === "workRecords.get") data = manual;
      if (path === "workRecords.update") {
        updates.push(args);
        manual = {
          ...manual,
          grossEarnings: Number(args.grossEarnings).toFixed(2),
          updatedAt: "2026-03-10T12:01:00.000Z",
        };
        data = { recordId: 101, success: true };
      }
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  return {
    requests,
    updates,
    recover: () => {
      fail = false;
    },
  };
}

test("applies local DST-day boundaries while preserving the imported statement calendar date", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/work-history");
  await expect(
    page.getByRole("heading", { name: "Work history", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("1–25 of 31 records", { exact: true })
  ).toBeVisible();
  await page.getByLabel("Start date", { exact: true }).fill("2026-03-08");
  await page.getByLabel("End date", { exact: true }).fill("2026-03-08");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByText("1–2 of 2 records", { exact: true })
  ).toBeVisible();
  const latest = state.requests.at(-1)!;
  expect(latest).toMatchObject({
    from: "2026-03-08T08:00:00.000Z",
    before: "2026-03-09T07:00:00.000Z",
    fromDate: "2026-03-08",
    beforeDate: "2026-03-09",
    offset: 0,
  });
  expect(
    Date.parse(String(latest.before)) - Date.parse(String(latest.from))
  ).toBe(23 * 3600000);
  const imported = page.getByRole("article", {
    name: "Delivery statement work record",
  });
  await expect(
    imported.getByText("Statement import", { exact: true })
  ).toBeVisible();
  await expect(
    imported.getByText("Hours not provided", { exact: false })
  ).toBeVisible();
  await expect(imported.locator('time[datetime="2026-03-08"]')).toHaveText(
    "Mar 8, 2026"
  );
  await expect(
    imported.getByText("Statement date (UTC)", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("$265.00", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 record has no reliable hours", { exact: true })
  ).toBeVisible();
});

test("resets pagination for source/name filters and keeps totals for all matching records", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/work-history");
  await expect(page.getByText("$595.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("26–31 of 31 records", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("$595.00", { exact: true })).toBeVisible();
  await page
    .getByLabel("Income source", { exact: true })
    .selectOption("Acme 100%_client");
  await page
    .getByLabel("Search platform or client", { exact: true })
    .fill("100%_client");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByText("1–1 of 1 records", { exact: true })
  ).toBeVisible();
  expect(state.requests.at(-1)).toMatchObject({
    source: "Acme 100%_client",
    query: "100%_client",
    offset: 0,
  });
  await expect(
    page.getByRole("button", { name: "Previous", exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Next", exact: true })
  ).toBeDisabled();
  await page
    .getByLabel("Search platform or client", { exact: true })
    .fill("no matching source");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No work matches these filters" })
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Income source", { exact: true })
      .getByRole("option", { name: "Delivery statement", exact: true })
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("edits only manual work through the existing editor and refreshes matching history", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/work-history");
  await expect(
    page.getByRole("button", { name: /Edit manual entry for/ })
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("article", { name: "Delivery statement work record" })
      .getByRole("link", { name: "Review imports" })
  ).toHaveAttribute("href", "/money-manager?tab=import");
  await page
    .getByRole("button", {
      name: "Edit manual entry for Acme 100%_client",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Base pay ($)", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .getByRole("article", { name: "Acme 100%_client work record" })
      .getByText("$215.00", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("$695.00", { exact: true })).toBeVisible();
  expect(state.updates).toHaveLength(1);
  expect(state.updates[0]).toMatchObject({
    recordId: 101,
    expectedUpdatedAt: "2026-03-09T12:00:00.000Z",
    grossEarnings: 200,
  });
});

test("shows a recoverable history error and blocks invalid date ranges", async ({
  page,
}) => {
  const state = await fixture(page, true);
  await page.goto("/work-history");
  await expect(
    page.getByRole("heading", { name: "Work history could not load" })
  ).toBeVisible();
  await expect(page.getByText("$0.00", { exact: true })).toHaveCount(0);
  state.recover();
  await page
    .getByRole("button", { name: "Retry history", exact: true })
    .click();
  await expect(
    page.getByText("1–25 of 31 records", { exact: true })
  ).toBeVisible();
  const requestCount = state.requests.length;
  await page.getByLabel("Start date", { exact: true }).fill("2026-03-10");
  await page.getByLabel("End date", { exact: true }).fill("2026-03-01");
  await expect(
    page.getByRole("button", { name: "Apply filters", exact: true })
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText(
    "end on or after the start"
  );
  expect(state.requests).toHaveLength(requestCount);
});
