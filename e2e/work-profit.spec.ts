import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function openPlanner(page: Page) {
  // The public calculator needs no authenticated user or live database.
  await page.route("**/api/trpc/**", route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const responses = paths.map(() => ({ result: { data: { json: null } } }));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  await page.goto("/tools/gig-hourly-rate");
  await expect(
    page.getByRole("heading", { name: "What did you really earn?" })
  ).toBeVisible();
}

async function fillSource(
  page: Page,
  index: number,
  values: {
    earnings: string;
    hours: string;
    miles?: string;
    costs?: string;
    name?: string;
  }
) {
  const source = page.getByRole("group", {
    name: `Income source ${index}`,
    exact: true,
  });
  if (values.name)
    await source.getByLabel("App, client or project").fill(values.name);
  await source
    .getByLabel("Total earnings ($)", { exact: true })
    .fill(values.earnings);
  await source
    .getByLabel("Total work hours", { exact: true })
    .fill(values.hours);
  await source
    .getByLabel("Business miles", { exact: true })
    .fill(values.miles ?? "0");
  await source
    .getByLabel("Other costs ($)", { exact: true })
    .fill(values.costs ?? "0");
}

test("keeps a real loss visible and rejects an invalid tax reserve", async ({
  page,
}) => {
  await openPlanner(page);
  await fillSource(page, 1, {
    earnings: "10",
    hours: "2",
    miles: "50",
    costs: "5",
    name: "Private delivery shift",
  });
  await page
    .getByLabel("Actual vehicle cost per mile ($)", { exact: true })
    .fill("0.4");
  await expect(page.getByTestId("take-home")).toHaveText("-$15.00");
  await expect(page.getByTestId("hourly-result")).toHaveText("-$7.50 / hour");
  await page.getByLabel("Tax reserve (%)", { exact: true }).fill("100");
  await expect(page.getByTestId("take-home")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("reserve below 100%");
  await page.getByLabel("Tax reserve (%)", { exact: true }).fill("0");
  await expect(page.getByTestId("take-home")).toHaveText("-$15.00");
  const storedFinancialData = await page.evaluate(() =>
    Object.values(localStorage).some(value =>
      value.includes("Private delivery shift")
    )
  );
  expect(storedFinancialData).toBe(false);
});

test("combines sources before reserving taxes and includes the time on loss-making work", async ({
  page,
}) => {
  await openPlanner(page);
  await fillSource(page, 1, {
    earnings: "100",
    hours: "4",
    name: "Delivery work",
  });
  await page.getByRole("button", { name: "Add an income source" }).click();
  await expect(page.getByTestId("take-home")).toHaveCount(0);
  await fillSource(page, 2, {
    earnings: "10",
    hours: "1",
    costs: "30",
    name: "Freelance revision",
  });
  await expect(page.getByTestId("take-home")).toHaveText("$60.00");
  await expect(page.getByTestId("hourly-result")).toHaveText("$12.00 / hour");
  const comparison = page.getByRole("list", {
    name: "Income source comparison",
  });
  await expect(comparison.getByRole("listitem").first()).toContainText(
    "Delivery work"
  );
  await expect(comparison.getByRole("listitem").last()).toContainText(
    "-$20.00 / hr"
  );
  await page.getByRole("button", { name: "Remove income source 2" }).click();
  await expect(page.getByTestId("take-home")).toHaveText("$75.00");
});

test("shows the earnings needed for the goal, protects CSV labels, and does not retain figures after reload", async ({
  page,
}) => {
  await openPlanner(page);
  await fillSource(page, 1, {
    earnings: "100",
    hours: "5",
    miles: "100",
    costs: "10",
    name: "=SUM(1,1)",
  });
  await page
    .getByLabel("Actual vehicle cost per mile ($)", { exact: true })
    .fill("0.4");
  await expect(
    page.getByText("$83.34 short of your goal", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("At the same hours and costs, you need $183.34", {
      exact: false,
    })
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const download = await downloading;
  const path = await download.path();
  expect(path).toBeTruthy();
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain('"\'=SUM(1,1)"');
  expect(csv).toContain("Vehicle cost per mile USD,0.4");
  expect(csv).toContain("Tax reserve percent,25");
  expect(csv).toContain("Required earnings at the same hours and costs,183.34");
  await page.reload();
  await expect(
    page.getByLabel("Total earnings ($)", { exact: true })
  ).toHaveValue("");
  await expect(page.getByTestId("take-home")).toHaveCount(0);
});

test("offers a clearly labeled example that works on a small screen and can be cleared", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlanner(page);
  await page.getByRole("button", { name: "Try an example" }).click();
  await expect(
    page.getByText("Illustrative example.", { exact: true })
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Income source comparison" })
      .getByRole("listitem")
  ).toHaveCount(3);
  await expect(page.getByTestId("hourly-result")).toHaveText("$16.28 / hour");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await page.getByRole("button", { name: "Start with my own figures" }).click();
  await expect(
    page.getByLabel("Total earnings ($)", { exact: true })
  ).toHaveValue("");
  await expect(page.getByTestId("take-home")).toHaveCount(0);
});
