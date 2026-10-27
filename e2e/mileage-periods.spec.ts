import { expect, test, type Page } from "@playwright/test";

async function mockPublic(page: Page, sessionGate?: Promise<void>) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    if (paths.includes("auth.me")) await sessionGate;
    const results = paths.map(() => ({ result: { data: { json: null } } }));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? results : results[0]
      ),
    });
  });
}

test("session resolution preserves figures entered before authentication finishes", async ({
  page,
}) => {
  let releaseSession!: () => void;
  const sessionGate = new Promise<void>(resolve => {
    releaseSession = resolve;
  });
  await mockPublic(page, sessionGate);
  await page.goto("/tools/mileage-deduction-calculator");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" })
  ).toBeVisible();
  await expect(page.locator(".marketing-footer")).toBeVisible();
  await expect(page.locator(".reading-year-note")).toHaveCount(0);
  await page.getByLabel("Tax year", { exact: true }).selectOption("2023");
  const miles = page.getByLabel("2023 business miles", { exact: true });
  await miles.fill("123");
  const sessionResponse = page.waitForResponse(response =>
    response.url().includes("auth.me")
  );
  releaseSession();
  await sessionResponse;
  // Let the query notification and React commit run before inspecting the form.
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  await expect(page.getByLabel("Tax year", { exact: true })).toHaveValue(
    "2023"
  );
  await expect(miles).toHaveValue("123");
});

test("2026 mileage deductions use both verified rate periods without counting a full-year total twice", async ({
  page,
}) => {
  await mockPublic(page);
  await page.goto("/tools/mileage-deduction-calculator");
  await page.getByLabel("Tax year", { exact: true }).selectOption("2026");
  const first = page.getByLabel("2026 · January 1–June 30 business miles", {
    exact: true,
  });
  const second = page.getByLabel("2026 · July 1–December 31 business miles", {
    exact: true,
  });
  await first.fill("100");
  await expect(
    page.getByRole("button", { name: "Calculate mileage deduction" })
  ).toBeDisabled();
  await second.fill("100");
  await page
    .getByRole("button", { name: "Calculate mileage deduction" })
    .click();
  await expect(page.getByText("$148.50", { exact: true })).toBeVisible();
  await expect(page.getByText("$72.50", { exact: true })).toBeVisible();
  await expect(page.getByText("$76.00", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/It is not a reimbursement, cash refund/)
  ).toBeVisible();
  await page.getByLabel("Tax year", { exact: true }).selectOption("2025");
  await expect(page.getByText("$148.50", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Calculate mileage deduction" })
  ).toBeDisabled();
  await page.getByLabel("2025 business miles", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Calculate mileage deduction" })
    .click();
  await expect(page.getByText("$70.00", { exact: true }).first()).toBeVisible();
});

test("mileage calculator rejects invalid values and accepts an explicit zero on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPublic(page);
  await page.goto("/tools/mileage-deduction-calculator");
  await page.getByLabel("Tax year", { exact: true }).selectOption("2023");
  const miles = page.getByLabel("2023 business miles", { exact: true });
  await miles.fill("-1");
  await expect(miles).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("button", { name: "Calculate mileage deduction" })
  ).toBeDisabled();
  await miles.fill("0");
  await page
    .getByRole("button", { name: "Calculate mileage deduction" })
    .click();
  await expect(page.getByText("$0.00", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("65.5¢ per mile", { exact: false })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
  ).toBe(false);
});
