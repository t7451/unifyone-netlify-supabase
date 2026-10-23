import { expect, test, type Page } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });
type Entry = {
  id: number;
  expenseDate: string;
  amountCents: number;
  category: string;
  merchant: string | null;
  notes: string | null;
  createdAt: string;
};
async function mockExpenses(
  page: Page,
  options: { uncertain?: boolean; many?: boolean; loadError?: boolean } = {}
) {
  const saves: Record<string, unknown>[] = [];
  const deletes: number[] = [];
  const queries: Record<string, unknown>[] = [];
  let failList = !!options.loadError;
  const entries: Entry[] = options.many
    ? Array.from({ length: 26 }, (_, index) => ({
        id: index + 1,
        expenseDate: "2026-10-01",
        amountCents: 100,
        category: "supplies",
        merchant: index === 0 ? "=SUM(1,2)" : `Shop ${index + 1}`,
        notes: index === 0 ? " +formula" : null,
        createdAt: "2026-10-01T20:00:00Z",
      }))
    : [];
  const references = new Map<string, number>();
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const input =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : JSON.parse(url.searchParams.get("input") || "{}");
    const responses = paths.map((path, index) => {
      const args = input?.[index]?.json ?? input?.json ?? {};
      let data: unknown = null;
      const error = () => ({
        error: {
          json: {
            message: "Could not confirm response",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
          },
        },
      });
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
        case "workExpenses.list": {
          queries.push({ ...args });
          if (failList) return error();
          const matching = args.period === "week" ? [] : entries;
          const total = matching.reduce((sum, row) => sum + row.amountCents, 0);
          const categoryTotals = new Map<
            string,
            { category: string; amountCents: number; count: number }
          >();
          for (const row of matching) {
            const prior = categoryTotals.get(row.category) ?? {
              category: row.category,
              amountCents: 0,
              count: 0,
            };
            prior.amountCents += row.amountCents;
            prior.count++;
            categoryTotals.set(row.category, prior);
          }
          data = {
            entries: matching.slice(args.offset ?? 0, (args.offset ?? 0) + 25),
            totalEntries: matching.length,
            totalAmountCents: total,
            totalsByCategory: [...categoryTotals.values()],
            range: {
              startDate: args.period === "all" ? null : "2026-10-01",
              endDate: args.asOfDate,
            },
            offset: args.offset ?? 0,
            limit: 25,
          };
          break;
        }
        case "workExpenses.create": {
          saves.push({ ...args });
          let id = references.get(args.clientReference);
          if (!id) {
            id = entries.length + 100;
            references.set(args.clientReference, id);
            entries.unshift({
              id,
              expenseDate: args.expenseDate,
              amountCents: args.amountCents,
              category: args.category,
              merchant: args.merchant ?? null,
              notes: args.notes ?? null,
              createdAt: new Date().toISOString(),
            });
          }
          if (options.uncertain && saves.length === 1) return error();
          data = { id };
          break;
        }
        case "workExpenses.remove":
          deletes.push(args.expenseId);
          {
            const index = entries.findIndex(row => row.id === args.expenseId);
            if (index >= 0) entries.splice(index, 1);
          }
          data = { removed: true };
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
    saves,
    deletes,
    queries,
    entries,
    restoreList: () => {
      failList = false;
    },
  };
}

test("records local expense cents, retries the identical save and only deletes after confirmation", async ({
  page,
}) => {
  const calls = await mockExpenses(page, { uncertain: true });
  await page.goto("/work-expenses");
  await expect(
    page.getByText("No expenses recorded for this period")
  ).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Date paid (local)").fill("2026-10-01");
  await dialog.getByLabel("Amount ($)", { exact: true }).fill("28.39");
  await dialog.getByLabel("Category", { exact: true }).selectOption("software");
  await dialog
    .getByLabel("Merchant or service (optional)")
    .fill("Client design software");
  await dialog.getByLabel("Notes (optional)").fill("Business subscription");
  await dialog
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("could not confirm");
  await expect(dialog.getByLabel("Amount ($)", { exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Retry same expense" }).click();
  await expect(dialog).not.toBeVisible();
  expect(calls.saves).toHaveLength(2);
  expect(calls.saves[1]).toEqual(calls.saves[0]);
  expect(calls.saves[0]).toMatchObject({
    expenseDate: "2026-10-01",
    amountCents: 2839,
    category: "software",
  });
  expect(calls.saves[0].clientReference).toMatch(/^[0-9a-f-]{36}$/);
  await expect(
    page.getByText("Client design software", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Delete Client design software expense on 2026-10-01",
    })
    .click();
  await page.getByRole("button", { name: "Keep expense", exact: true }).click();
  expect(calls.deletes).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Delete Client design software expense on 2026-10-01",
    })
    .click();
  await page
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  await expect(
    page.getByText("No expenses recorded for this period")
  ).toBeVisible();
  expect(calls.deletes).toHaveLength(1);
});

test("keeps mobile validation drafts in memory and recovers unavailable totals", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = await mockExpenses(page, { loadError: true });
  await page.goto("/work-expenses");
  await expect(page.getByRole("alert")).toContainText("Totals are unavailable");
  calls.restoreList();
  await page.getByRole("button", { name: "Retry expenses" }).click();
  await expect(
    page.getByText("No expenses recorded for this period")
  ).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const value of ["", "-1", "1.234", "1000000", "1e2"]) {
    await dialog.getByLabel("Amount ($)", { exact: true }).fill(value);
    await dialog
      .getByRole("button", { name: "Save expense", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("Enter an amount");
  }
  await dialog.getByLabel("Amount ($)", { exact: true }).fill("10");
  await dialog.getByLabel("Date paid (local)").fill("2099-10-01");
  await dialog
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("on or before today");
  expect(calls.saves).toHaveLength(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    })
  );
  expect(stored).not.toContain("2099-10-01");
});

test("reviews full-period totals with pagination and exports only visible formula-safe rows", async ({
  page,
}) => {
  const calls = await mockExpenses(page, { many: true });
  await page.goto("/work-expenses");
  await expect(
    page.getByText("Showing 1–25 of 26.", { exact: false })
  ).toBeVisible();
  await expect(page.getByText("$26.00", { exact: true }).first()).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export visible rows" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("rows-1-25");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv).toContain('"\' +formula"');
  expect(csv).not.toContain("Shop 26");
  await page.getByRole("button", { name: "Next expenses" }).click();
  await expect(
    page.getByText("Showing 26–26 of 26.", { exact: false })
  ).toBeVisible();
  await expect(page.getByText("Shop 26", { exact: true })).toBeVisible();
  await page.getByLabel("Review period").selectOption("week");
  await expect(
    page.getByText("No expenses recorded for this period")
  ).toBeVisible();
  expect(
    calls.queries.some(
      query =>
        query.period === "week" &&
        query.offset === 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(String(query.asOfDate))
    )
  ).toBe(true);
});
