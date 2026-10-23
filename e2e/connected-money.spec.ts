import { expect, test, type Page } from "@playwright/test";

// Browser integration fixtures only. No actual provider or financial accounts.
const bankId = "b50dfce0-717e-458f-8287-c020c598da18";
const gigId = "06063d66-0a23-4f8d-8c53-5bdd5a82f1fe";
async function mockApp(
  page: Page,
  configured = true,
  failFirstRefresh = false
) {
  const connections: Record<string, unknown>[] = [];
  const activity: Record<string, unknown>[] = [];
  await page.route("https://cdn.plaid.com/**", route =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'window.Plaid = { create: options => ({ open: () => options.onSuccess("test-public-token"), destroy: () => {} }) };',
    })
  );
  await page.route("https://plugin.argyle.com/**", route =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.Argyle = { create: options => ({ open: () => { options.onAccountConnected(); options.onClose(); }, close: () => {} }) };",
    })
  );
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const input =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : null;
    const responses = paths.map((path, index) => {
      let data: unknown = null;
      const args = input?.[index]?.json ?? input?.json ?? {};
      if (path === "financialConnections.refresh" && failFirstRefresh) {
        failFirstRefresh = false;
        const connection = connections.find(
          row => row.id === args.connectionId
        );
        if (connection) connection.status = "sync_error";
        return {
          error: {
            json: {
              message:
                "The data provider could not complete this request. Your previous data is unchanged.",
              code: -32603,
              data: { code: "BAD_GATEWAY", httpStatus: 502, path },
            },
          },
        };
      }
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
          data = [];
          break;
        case "financialConnections.availability":
          data = {
            plaid: { configured, environment: "sandbox" },
            argyle: { configured, environment: "sandbox" },
          };
          break;
        case "financialConnections.list":
          data = connections;
          break;
        case "financialConnections.beginBankLink":
          data = { token: "test-link-token", environment: "sandbox" };
          break;
        case "financialConnections.completeBankLink":
          connections.push({
            id: bankId,
            provider: "plaid",
            environment: "sandbox",
            status: "ready",
            accounts: [
              {
                id: "bank",
                name: "Test checking",
                mask: "1234",
                state: "connected",
              },
            ],
            lastSyncedAt: null,
          });
          data = { connectionId: bankId };
          break;
        case "financialConnections.beginGigLink":
          connections.push({
            id: gigId,
            provider: "argyle",
            environment: "sandbox",
            status: "ready",
            accounts: [
              { id: "gig", name: "Test delivery app", state: "connected" },
            ],
            lastSyncedAt: null,
          });
          data = {
            connectionId: gigId,
            token: "test-user-token",
            flowId: "test-flow",
            environment: "sandbox",
          };
          break;
        case "financialConnections.refresh": {
          const isBank = args.connectionId === bankId;
          const id = isBank ? "bank-record" : "gig-record";
          if (!activity.some(row => row.id === id))
            activity.push({
              id,
              connectionId: args.connectionId,
              kind: isBank ? "bank_transaction" : "gig_earning",
              date: "2026-10-23",
              description: isBank
                ? "Test platform deposit"
                : "Test completed gig",
              amount: isBank ? "100.00" : "38.50",
              currency: "USD",
              pending: false,
              sourceAccountId: isBank ? "bank" : "gig",
              environment: "sandbox",
            });
          data = { imported: 1, accounts: 1 };
          break;
        }
        case "financialConnections.disconnect": {
          const index = connections.findIndex(
            row => row.id === args.connectionId
          );
          if (index >= 0) connections.splice(index, 1);
          for (let index = activity.length - 1; index >= 0; index--)
            if (activity[index].connectionId === args.connectionId)
              activity.splice(index, 1);
          data = { disconnected: true };
          break;
        }
        case "financialConnections.overview":
          data = {
            activity,
            total: activity.length,
            totals: activity.map(row => ({
              kind: row.kind,
              currency: row.currency,
              environment: "sandbox",
              incoming: row.amount,
              outgoing: "0",
              net: row.amount,
            })),
          };
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
}

test("does not offer an active connection flow before setup or consent", async ({
  page,
}) => {
  await mockApp(page, false);
  await page.goto("/connected-money");
  await expect(
    page.getByRole("heading", { name: "Connected money", exact: true })
  ).toBeVisible();
  await expect(page.getByLabel(/I authorize read-only access/)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Start with the work you already did" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Import earnings/ })
  ).toHaveAttribute("href", "/money-manager?tab=import");
  await expect(
    page.getByRole("link", { name: /^Track work manually/ })
  ).toHaveAttribute("href", "/gig-command");
  await expect(
    page.getByRole("button", { name: "Link a bank" })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Link gig accounts" })
  ).toBeDisabled();
  await expect(
    page.getByText("Your connected accounts will appear here.", {
      exact: false,
    })
  ).toBeVisible();
});

test("links both providers, separates their totals, and revokes a selected connection", async ({
  page,
}) => {
  await mockApp(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/connected-money");
  await expect(
    page.getByRole("button", { name: "Link a bank" })
  ).toBeDisabled();
  await page.getByLabel(/I authorize read-only access/).check();
  await page.getByRole("button", { name: "Link a bank" }).click();
  await expect(
    page.getByRole("cell", { name: "Test platform deposit", exact: false })
  ).toBeVisible();
  await page.getByRole("button", { name: "Link gig accounts" }).click();
  await expect(
    page.getByRole("cell", { name: "Test completed gig", exact: false })
  ).toBeVisible();
  await expect(page.getByText("Bank activity · USD · sandbox")).toBeVisible();
  await expect(page.getByText("Gig earnings · USD · sandbox")).toBeVisible();
  await expect(page.getByText("$138.50", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Sandbox connections contain test data.", { exact: false })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Disconnect", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Revoke and delete" }).click();
  await expect(
    page.getByRole("cell", { name: "Test platform deposit", exact: false })
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "Test completed gig", exact: false })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("shows imported activity as readable mobile cards without horizontal page scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApp(page);
  await page.goto("/connected-money");
  await page.getByLabel(/I authorize read-only access/).check();
  await page.getByRole("button", { name: "Link a bank" }).click();
  const list = page.getByRole("list", { name: "Imported activity" });
  await expect(list).toBeVisible();
  await expect(
    list.getByText("Test platform deposit", { exact: true })
  ).toBeVisible();
  await expect(list.getByText("$100.00", { exact: true })).toBeVisible();
  await expect(list.getByText("Test data", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("keeps a provider error visible and lets the worker retry the imported connection", async ({
  page,
}) => {
  await mockApp(page, true, true);
  await page.goto("/connected-money");
  await page.getByLabel(/I authorize read-only access/).check();
  await page.getByRole("button", { name: "Link a bank" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your previous data is unchanged" })
  ).toBeVisible();
  await expect(page.getByText("Refresh needed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Test platform deposit", exact: false })
  ).toBeVisible();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your previous data is unchanged" })
  ).toHaveCount(0);
});
