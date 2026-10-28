import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const routes = [
  "/overview",
  "/gig-command",
  "/money-manager",
  "/work-insights",
  "/work-expenses",
  "/work-history",
  "/connected-money",
  "/settings",
  "/notifications",
  "/billing",
  "/gig-worker-plans",
];
const compactRoutes = [
  "/overview",
  "/gig-command",
  "/money-manager",
  "/work-insights",
  "/connected-money",
  "/settings",
];
const worker = {
  id: 7,
  tenantId: 1,
  primaryProduct: "gig",
  name: "Taylor Worker",
  email: "worker@example.com",
  role: "user",
  openId: "workspace-fixture",
  emailVerified: true,
};
const starter = {
  id: 1,
  slug: "gig-starter",
  name: "Gig Starter",
  tier: "starter",
  priceMonthly: "0",
  priceYearly: "0",
  monthlyAICredits: 25,
  features: ["shift_tracker", "mileage_log"],
  description: "Record your work",
};
const insights = {
  period: "month",
  tracked: { earnings: 300, hours: 10, miles: 100, otherCosts: 0 },
  bySource: [
    {
      source: "Client work",
      earnings: 300,
      hours: 10,
      miles: 100,
      otherCosts: 0,
      records: 2,
    },
  ],
  recordedCount: 2,
  excluded: { count: 0, earnings: 0 },
  imported: { count: 0, earnings: 0, miles: 0 },
  expenses: {
    count: 2,
    totalCents: 5000,
    vehicleCents: 4000,
    otherCents: 1000,
  },
};

async function authenticatedWorkspace(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  // Returning worker fixture has already chosen essential cookies only.
  await page.context().addCookies([
    {
      name: "uo_consent",
      value: encodeURIComponent(
        JSON.stringify({
          necessary: true,
          analytics: false,
          v: 1,
          ts: Date.now(),
        })
      ),
      url: origin,
    },
  ]);
  const calls: string[] = [];
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/trpc/")) {
      const paths = url.pathname.split("/api/trpc/")[1].split(",");
      const responses = paths.map(path => {
        calls.push(path);
        let data: unknown = null;
        switch (path) {
          case "auth.me":
            data = worker;
            break;
          case "tenant.list":
            data = [
              {
                id: 1,
                name: "Worker workspace",
                slug: "worker-workspace",
                primaryProduct: "gig",
                status: "active",
              },
            ];
            break;
          case "notifications.list":
          case "notifications.listTriggers":
          case "notifications.listAnnouncements":
          case "notifications.listAllAnnouncements":
          case "subscription.getInvoices":
          case "financialConnections.list":
          case "moneyManager.listRules":
          case "moneyManager.listEnvelopes":
          case "moneyManager.listImportBatches":
            data = [];
            break;
          case "subscription.getStatus":
            data = {
              status: "none",
              tenantStatus: "active",
              isMaster: false,
              plan: null,
              billingCycle: null,
              subscriptionCurrentPeriodEnd: null,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              trialDaysLeft: null,
              usage: {
                products: 0,
                orders: 0,
                customers: 0,
                maxProducts: 100,
                maxOrders: 1000,
                maxUsers: 5,
              },
            };
            break;
          case "tenant.getUsage":
            data = { productCount: 0, orderCount: 0, userCount: 1 };
            break;
          case "notifications.unreadCount":
            data = { count: 0 };
            break;
          case "ai.getSuggestions":
            data = [];
            break;
          case "gigWorker.getPlans":
            data = [
              starter,
              {
                ...starter,
                id: 2,
                slug: "gig-pro",
                name: "Gig Pro",
                tier: "pro",
                priceMonthly: "4.99",
                priceYearly: "49",
                monthlyAICredits: 300,
                features: ["shift_tracker", "route_optimizer"],
              },
            ];
            break;
          case "gigWorker.getSubscription":
            data = {
              status: "active",
              plan: starter,
              subscription: null,
              aiUsage: null,
              aiCreditsRemaining: 25,
            };
            break;
          case "gigWorker.checkFeatureAccess":
            data = {
              hasAccess: false,
              requiredPlan: "gig-pro",
              currentPlan: "gig-starter",
            };
            break;
          case "moneyManager.getShiftStats":
            data = {
              totalEarnings: 300,
              totalMiles: 100,
              totalShifts: 2,
              totalHours: 10,
              avgPerHour: 30,
              taxDeduction: 70,
            };
            break;
          case "moneyManager.getYTDDeduction":
            data = { ytdMiles: 100, ytdDeduction: 70, quarterlyEstimate: 0 };
            break;
          case "moneyManager.listShifts":
            data = { shifts: [], total: 0 };
            break;
          case "moneyManager.getMileageSummary":
            data = { totalMiles: 100, totalDeduction: 70, logs: [] };
            break;
          case "moneyManager.getEnvelopeBalance":
            data = { balanceCents: 0 };
            break;
          case "moneyManager.getTaxEstimate":
            data = { quarterly: { quarterlyPaymentCents: 0 } };
            break;
          case "moneyManager.getPointsBalance":
            data = { totalPoints: 0, level: 1 };
            break;
          case "workInsights.summary":
            data = insights;
            break;
          case "workExpenses.list":
            data = {
              entries: [],
              totalEntries: 0,
              totalAmountCents: 0,
              totalsByCategory: [],
              range: { startDate: null, endDate: "2026-10-27" },
              offset: 0,
              limit: 25,
            };
            break;
          case "workHistory.list":
            data = {
              entries: [],
              totalEntries: 0,
              totalEarningsUSD: 0,
              totalRecordedHours: 0,
              unknownHoursCount: 0,
              totalRecordedMiles: 0,
              unknownMilesCount: 0,
              sources: [],
              limit: 25,
              offset: 0,
            };
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
        }
        return { result: { data: { json: data } } };
      });
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          url.searchParams.get("batch") === "1" ? responses : responses[0]
        ),
      });
    }
    if (url.pathname.startsWith("/api/") || url.origin !== origin)
      return route.fulfill({ status: 204, body: "" });
    return route.continue();
  });
  return calls;
}

test.beforeEach(async ({ page, baseURL }) => {
  await authenticatedWorkspace(page, baseURL ?? "http://localhost:3000");
});

for (const width of [320, 390, 768, 1440]) {
  test.describe(`workspace at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const path of width === 320 || width === 768
      ? compactRoutes
      : routes) {
      test(`${path} keeps the workspace shell usable`, async ({
        page,
      }, testInfo) => {
        const errors: string[] = [];
        const missingAssets: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (message.type() === "error") errors.push(message.text());
        });
        page.on("response", response => {
          if (response.status() >= 400) missingAssets.push(response.url());
        });
        await page.goto(path);
        await expect(page.getByRole("main")).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute(
          "data-workspace-brand",
          "unifyone"
        );
        if (width < 768) {
          await expect(
            page.getByRole("navigation", { name: "Primary worker navigation" })
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Toggle Sidebar", exact: true })
            .click();
          await expect(
            page
              .getByRole("dialog")
              .locator('svg[data-brand-mark="unifyone"]')
              .first()
          ).toBeVisible();
          await expect(
            page
              .getByRole("dialog")
              .locator(`a[href="${path}"][aria-current="page"]`)
              .first()
          ).toBeVisible();
          await page.keyboard.press("Escape");
        } else {
          await expect(
            page.locator('svg[data-brand-mark="unifyone"]').first()
          ).toBeVisible();
          await expect(
            page.locator(`a[href="${path}"][aria-current="page"]`).first()
          ).toBeVisible();
        }
        const images = page.locator("img");
        for (let index = 0; index < (await images.count()); index++)
          await images.nth(index).scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            images.evaluateAll(list =>
              list.every(image => {
                const el = image as HTMLImageElement;
                return el.complete && el.naturalWidth > 0;
              })
            )
          )
          .toBe(true);
        const metrics = await page.evaluate(() => ({
          path: location.pathname,
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          headings: [...document.querySelectorAll("h1")].map(
            el => el.textContent
          ),
          mains: document.querySelectorAll("main").length,
          overflow: [...document.body.querySelectorAll("*")]
            .filter(el => {
              const rect = el.getBoundingClientRect();
              if (!rect.width || !rect.height || rect.right <= innerWidth + 1)
                return false;
              let right = rect.right;
              for (
                let parent = el.parentElement;
                parent && parent !== document.body;
                parent = parent.parentElement
              ) {
                if (
                  ["hidden", "auto", "scroll", "clip"].includes(
                    getComputedStyle(parent).overflowX
                  )
                )
                  right = Math.min(right, parent.getBoundingClientRect().right);
              }
              return right > innerWidth + 1;
            })
            .slice(0, 12)
            .map(el => ({
              tag: el.tagName,
              class: el.className,
              text: el.textContent?.trim().slice(0, 100),
              right: el.getBoundingClientRect().right,
            })),
        }));
        const metricsPath = testInfo.outputPath("workspace-metrics.json");
        await writeFile(metricsPath, JSON.stringify(metrics, null, 2));
        await testInfo.attach("workspace-metrics", {
          path: metricsPath,
          contentType: "application/json",
        });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath("workspace.png") });
        expect(
          metrics.scrollWidth,
          JSON.stringify(metrics.overflow)
        ).toBeLessThanOrEqual(metrics.width);

        expect(missingAssets).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  });
}

test("mobile navigation reaches a non-tab page and keeps its active state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle Sidebar", exact: true })
    .click();
  const drawer = page.getByRole("dialog");
  await drawer
    .getByRole("link", { name: "Work expenses", exact: true })
    .click();
  await expect(page).toHaveURL(/\/work-expenses$/);
  await expect(drawer).not.toBeVisible();
  await page
    .getByRole("button", { name: "Toggle Sidebar", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Work expenses", exact: true })
  ).toHaveAttribute("aria-current", "page");
});

test("desktop account menu stays usable when the sidebar is collapsed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/overview");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  const account = page.locator(
    '[data-sidebar="footer"] button[aria-haspopup="menu"]'
  );
  await account.click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-workspace-brand",
    "unifyone"
  );
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
});

test("expense dialog keeps an invalid draft intact and inherits the workspace brand", async ({
  page,
}) => {
  await page.goto("/work-expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount ($)", { exact: true }).fill("-5");
  await dialog
    .getByLabel("Merchant or service (optional)")
    .fill("Client software");
  await dialog
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Merchant or service (optional)")).toHaveValue(
    "Client software"
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-workspace-brand",
    "unifyone"
  );
});

test("switching profitability cost modes preserves editable assumptions", async ({
  page,
}) => {
  await page.goto("/work-insights");
  const reserve = page.getByLabel("Planning tax reserve (%)", { exact: true });
  await reserve.fill("10");
  const recorded = page.locator('input[name="cost-mode"][value="recorded"]');
  await recorded.check();
  await expect(reserve).toHaveValue("10");
  await page.locator('input[name="cost-mode"][value="mileage"]').check();
  await expect(reserve).toHaveValue("10");
});

test("unconfigured providers remain gated", async ({ page }) => {
  await page.goto("/connected-money");
  await expect(
    page.getByRole("button", { name: "Link a bank", exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Link gig accounts", exact: true })
  ).toBeDisabled();
});
