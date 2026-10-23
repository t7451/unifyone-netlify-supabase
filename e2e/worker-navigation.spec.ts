import { expect, test, type Page } from "@playwright/test";

async function mockWorker(page: Page) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const results = paths.map(path => {
      let data: unknown = null;
      switch (path) {
        case "auth.me":
          data = {
            id: 7,
            tenantId: 1,
            primaryProduct: "gig",
            name: "Test worker",
            role: "user",
            openId: "test",
            emailVerified: true,
          };
          break;
        case "tenant.list":
          data = [{ id: 1, name: "My work", primaryProduct: "gig" }];
          break;
        case "notifications.list":
        case "financialConnections.list":
          data = [];
          break;
        case "notifications.unreadCount":
          data = { count: 0 };
          break;
        case "ai.getSuggestions":
          data = { suggestions: [] };
          break;
        case "financialConnections.availability":
          data = {
            plaid: { configured: false, environment: "sandbox" },
            argyle: { configured: false, environment: "sandbox" },
          };
          break;
        case "financialConnections.overview":
          data = { activity: [], total: 0, totals: [] };
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
        case "moneyManager.getYTDDeduction":
          data = { ytdMiles: 0, ytdDeduction: 0, quarterlyEstimate: 0 };
          break;
      }
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? results : results[0]
      ),
    });
  });
}

test("mobile workers can reach daily tasks without opening the menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockWorker(page);
  await page.goto("/connected-money");
  const navigation = page.getByRole("navigation", {
    name: "Primary worker navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await expect(
    navigation.getByRole("link", { name: "Accounts", exact: true })
  ).toHaveAttribute("aria-current", "page");
  for (const [name, href] of [
    ["Overview", "/overview"],
    ["Track work", "/gig-command"],
    ["Earnings", "/money-manager"],
    ["Accounts", "/connected-money"],
  ]) {
    await expect(
      navigation.getByRole("link", { name, exact: true })
    ).toHaveAttribute("href", href);
  }
  // New visitors choose their cookie preference before using bottom controls.
  await page
    .getByRole("button", { name: "Essentials only", exact: true })
    .click();
  await navigation.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(
    navigation.getByRole("link", { name: "Overview", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Open AI Assistant", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ })
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("worker-overview-mobile.png"),
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(overflow).toBe(false);
});

test("desktop keeps optional tools folded and supports keyboard access to content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockWorker(page);
  await page.goto("/connected-money");
  const more = page.getByRole("button", { name: "More tools", exact: true });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("link", { name: "Revenue Command", exact: true })
  ).toBeHidden();
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "Revenue Command", exact: true })
  ).toBeVisible();
  const accounts = page.getByRole("link", {
    name: "Connected accounts",
    exact: true,
  });
  await expect(accounts).toHaveAttribute("aria-current", "page");
  const fontSize = await accounts.evaluate(node =>
    parseFloat(getComputedStyle(node.querySelector("span")!).fontSize)
  );
  expect(fontSize).toBeGreaterThanOrEqual(14);
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("mobile menu remains usable after collapsing the desktop sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockWorker(page);
  await page.goto("/connected-money");
  await page
    .getByRole("button", { name: "Essentials only", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Toggle Sidebar", exact: true })
    .click();
  const more = page.getByRole("button", { name: "More tools", exact: true });
  await expect(more).toBeVisible();
  await more.click();
  await expect(
    page.getByRole("link", { name: "Revenue Command", exact: true })
  ).toBeVisible();
  await more.click();
  await expect(
    page.getByRole("link", { name: "Revenue Command", exact: true })
  ).toBeHidden();
  await page
    .getByRole("link", { name: "Overview", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(more).toBeHidden();
});
