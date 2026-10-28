import { expect, test, type Page } from "@playwright/test";

const summary = {
  expenses: {
    count: 3,
    totalCents: 5000,
    vehicleCents: 4000,
    otherCents: 1000,
  },
  period: "month",
  tracked: { earnings: 300, hours: 10, miles: 100, otherCosts: 0 },
  bySource: [
    {
      source: "Delivery apps",
      earnings: 120,
      hours: 2,
      miles: 100,
      otherCosts: 0,
      records: 2,
    },
    {
      source: "Freelance client",
      earnings: 180,
      hours: 8,
      miles: 0,
      otherCosts: 0,
      records: 1,
    },
  ],
  recordedCount: 4,
  excluded: { count: 1, earnings: 100 },
  imported: { count: 2, earnings: 9999, miles: 0 },
};
async function fixture(
  page: Page,
  mode: "loaded" | "empty" | "error" = "loaded"
) {
  let shouldFail = mode === "error";
  const queries: Record<string, unknown>[] = [];
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    let status = 200;
    const inputs = JSON.parse(url.searchParams.get("input") ?? "{}");
    const responses = paths.map((path, index) => {
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
      if (path === "notifications.list" || path === "ai.getSuggestions")
        data = [];
      if (path === "notifications.unreadCount") data = { count: 0 };
      if (path === "workInsights.summary") {
        queries.push(inputs[index]?.json ?? inputs.json ?? {});
        if (shouldFail) {
          status = 500;
          return {
            error: {
              json: {
                message: "Fixture server unavailable",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
              },
            },
          };
        }
        data =
          mode === "empty"
            ? {
                ...summary,
                tracked: { earnings: 0, hours: 0, miles: 0, otherCosts: 0 },
                bySource: [],
                recordedCount: 0,
                excluded: { count: 0, earnings: 0 },
              }
            : summary;
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
    queries,
    recover: () => {
      shouldFail = false;
    },
  };
}

test("calculates a weighted result without folding imports or unknown hours into it", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/work-insights");
  await expect(
    page.getByRole("heading", { name: "What your work pays", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "$191.25", exact: true })
  ).toBeVisible();
  await expect(page.getByText("$19.13", { exact: false })).toBeVisible();
  await expect(
    page.getByText("3 completed sessions included", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("$9,999.00", { exact: true })).toBeVisible();
  await expect(page.getByText(/1 completed record is excluded/)).toBeVisible();
  await expect(
    page.getByText(/They are not added to the profit figures below/)
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "$42.50", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "$22.50", exact: true })
  ).toBeVisible();
  await page
    .getByLabel("Extra unlogged costs this period ($)", { exact: true })
    .fill("50");
  await expect(
    page.getByRole("heading", { name: "$153.75", exact: true })
  ).toBeVisible();
  await expect(page.getByText("$15.38", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "$42.50", exact: true })
  ).toBeVisible();
});

test("preserves losses and withholds the calculation while assumptions are invalid", async ({
  page,
}) => {
  await fixture(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/work-insights");
  await page
    .getByLabel("Extra unlogged costs this period ($)", { exact: true })
    .fill("400");
  await expect(
    page.getByRole("heading", { name: "-$145.00", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(/no tax reserve is added to a loss/)
  ).toBeVisible();
  await page
    .getByLabel("Planning tax reserve (%)", { exact: true })
    .fill("100");
  await expect(
    page.getByText("Enter a reserve from 0% to less than 100%.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Check your assumptions" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "-$145.00", exact: true })
  ).toHaveCount(0);
  await page.getByLabel("Planning tax reserve (%)", { exact: true }).fill("25");
  await page
    .getByLabel("Vehicle cost per mile ($)", { exact: true })
    .fill("1e308");
  await expect(
    page.getByRole("heading", { name: "These values are too large" })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("shows missing work time as an actionable empty state on mobile", async ({
  page,
}) => {
  await fixture(page, "empty");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/work-insights");
  await expect(
    page.getByRole("heading", { name: "Your earnings need working time" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Track a work session" })
  ).toHaveAttribute("href", "/gig-command");
  await expect(
    page.getByRole("link", { name: "View earnings and imports" })
  ).toHaveAttribute("href", "/money-manager");
  await expect(
    page.getByText("$0.00 per recorded hour", { exact: true })
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("offers retry on load failure and renders records when the request recovers", async ({
  page,
}) => {
  const state = await fixture(page, "error");
  await page.goto("/work-insights");
  await expect(
    page.getByRole("heading", { name: "Your work insights could not load" })
  ).toBeVisible();
  state.recover();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "$191.25", exact: true })
  ).toBeVisible();
});

test("switches saved expense modes without counting fuel and mileage costs twice", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/work-insights");
  await expect(
    page.getByRole("heading", { name: "$191.25", exact: true })
  ).toBeVisible();
  await expect(page.getByText("3 saved expenses · $50.00 total")).toBeVisible();
  await expect(
    page.getByText(/self-reported and may not include every actual cost/)
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review or log expenses" })
  ).toHaveAttribute("href", "/work-expenses");
  await page.getByRole("radio", { name: /^Recorded expenses/ }).check();
  await expect(
    page.getByRole("heading", { name: "$187.50", exact: true })
  ).toBeVisible();
  await expect(
    page.getByLabel("Vehicle cost per mile ($)", { exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "$60.00", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(/Comparison before unallocated expenses/)
  ).toBeVisible();
  await page
    .getByLabel("Extra unlogged costs this period ($)", { exact: true })
    .fill("400");
  await expect(
    page.getByRole("heading", { name: "-$150.00", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(/no tax reserve is added to a loss/)
  ).toBeVisible();
  await page.getByRole("radio", { name: /^Mileage cost estimate/ }).check();
  await expect(
    page.getByRole("heading", { name: "-$145.00", exact: true })
  ).toBeVisible();
});

test("an overnight tab updates its expense reporting date at the local month boundary", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-31T23:59:50Z") });
  const state = await fixture(page);
  await page.goto("/work-insights");
  await expect(
    page.getByRole("heading", { name: "$191.25", exact: true })
  ).toBeVisible();
  expect(state.queries.at(-1)?.asOfDate).toBe("2026-10-31");
  await page.clock.runFor(10_010);
  await expect.poll(() => state.queries.at(-1)?.asOfDate).toBe("2026-11-01");
  await expect(
    page.getByText(/month or year through 2026-11-01/)
  ).toBeVisible();
});
