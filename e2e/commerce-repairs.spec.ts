import { expect, test, type Page } from "@playwright/test";

const token = "a".repeat(96);
async function fixture(
  page: Page,
  options: {
    signedIn?: boolean;
    failProduct?: boolean;
    rejectInvite?: boolean;
    paginate?: boolean;
  } = {}
) {
  let signedIn = options.signedIn !== false;
  let failed = false;
  const updates: Record<string, unknown>[] = [];
  const customerUpdates: Record<string, unknown>[] = [];
  const accepts: Record<string, unknown>[] = [];
  const invites: Record<string, unknown>[] = [];
  const integrationWrites: Record<string, unknown>[] = [];
  let orderGets = 0;
  const product = {
    id: 11,
    name: "Example product",
    description: "Old description",
    sku: "SKU-1",
    price: "10.00",
    compareAtPrice: "20.00",
    categoryId: 3 as number | null,
    imageUrl: "",
    status: "active",
    inventory: { quantity: 5, lowStockThreshold: 2 },
  };
  const customer = {
    id: 21,
    email: "customer@example.com",
    firstName: "Alex",
    lastName: "Worker",
    phone: "123",
    tags: ["loyal"],
    address: {
      line1: "Old street",
      line2: "Unit 4",
      city: "Portland",
      state: "OR",
      zip: "97000",
      country: "US",
    },
    totalOrders: 1,
    totalSpent: "10",
    createdAt: "2026-10-01T00:00:00Z",
  };
  const order = {
    id: 11,
    orderNumber: "ORDER-11",
    customerName: "Alex",
    customerEmail: "customer@example.com",
    status: "pending",
    paymentStatus: "pending",
    subtotal: "10",
    shippingAmount: "0",
    taxAmount: "0",
    total: "10",
    items: [],
    createdAt: "2026-10-01T00:00:00Z",
  };
  const integration = {
    shopifyCheckoutUrl: "https://shop.example.com/old",
    shopify: { connected: false },
    n8n: { configured: true, webhookUrl: "https://flows.example.com/old" },
    stripe: { connected: false },
    paypal: { configured: false },
  };
  await page.context().addCookies([
    {
      name: "uo_consent",
      value: encodeURIComponent(
        JSON.stringify({
          v: 1,
          analytics: false,
          necessary: true,
          ts: Date.now(),
        })
      ),
      url: "http://127.0.0.1:3012",
    },
  ]);
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/trpc/")) {
      const paths = url.pathname.split("/api/trpc/")[1].split(",");
      const body =
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : JSON.parse(url.searchParams.get("input") || "{}");
      if (
        options.paginate &&
        paths.some(
          (path, index) =>
            ["products.list", "orders.list", "customers.list"].includes(path) &&
            (body?.[index]?.json ?? body?.json ?? {}).page === 2
        )
      )
        await new Promise(resolve => setTimeout(resolve, 150));
      const responses = paths.map((path, index) => {
        const args = body?.[index]?.json ?? body?.json ?? {};
        let data: unknown = null;
        const error = (message: string) => ({
          error: {
            json: {
              message,
              code: -32603,
              data: { code: "FORBIDDEN", httpStatus: 403, path },
            },
          },
        });
        switch (path) {
          case "auth.me":
            data = signedIn
              ? {
                  id: 7,
                  tenantId: 1,
                  name: "Test admin",
                  email: "member@example.com",
                  emailVerified: true,
                  role: "admin",
                  primaryProduct: "commerce",
                  openId: "fixture",
                }
              : null;
            break;
          case "tenant.list":
            data = [
              { id: 1, name: "Example workspace", primaryProduct: "commerce" },
            ];
            break;
          case "notifications.unreadCount":
            data = { count: 0 };
            break;
          case "notifications.list":
          case "ai.getSuggestions":
          case "notifications.listAnnouncements":
            data = [];
            break;
          case "products.list":
            data = {
              items: [
                options.paginate && args.page === 2
                  ? { ...product, id: 12, name: "Second-page product" }
                  : product,
              ],
              total: options.paginate ? 26 : 1,
              totalPages: options.paginate ? 2 : 1,
              page: args.page ?? 1,
              limit: 25,
            };
            break;
          case "products.categories":
            data = [{ id: 3, name: "Old category" }];
            break;
          case "products.update":
            updates.push(args);
            if (options.failProduct && !failed) {
              failed = true;
              return error("Product save unavailable. Please retry.");
            }
            Object.assign(product, args);
            if (args.quantity !== undefined)
              product.inventory = {
                quantity: args.quantity,
                lowStockThreshold: args.lowStockThreshold,
              };
            data = product;
            break;
          case "customers.list":
            data = {
              items: [
                options.paginate && args.page === 2
                  ? {
                      ...customer,
                      id: 22,
                      email: "second@example.com",
                      firstName: "Blake",
                      lastName: "Second",
                    }
                  : customer,
              ],
              total: options.paginate ? 26 : 1,
              totalPages: options.paginate ? 2 : 1,
              page: args.page ?? 1,
              limit: 25,
            };
            break;
          case "orders.updateCustomer":
            customerUpdates.push(args);
            Object.assign(customer, args);
            data = { success: true };
            break;
          case "orders.customerOrders":
            data = [];
            break;
          case "orders.list":
            data = {
              items: [
                options.paginate && args.page === 2
                  ? { ...order, id: 12, orderNumber: "ORDER-SECOND" }
                  : order,
              ],
              total: options.paginate ? 26 : 1,
              totalPages: options.paginate ? 2 : 1,
              page: args.page ?? 1,
              limit: 25,
            };
            break;
          case "orders.get":
            orderGets++;
            data = { ...order };
            break;
          case "orders.updateStatus":
            Object.assign(order, args);
            data = { success: true };
            break;
          case "integrations.status":
            data = integration;
            break;
          case "integrations.shopifySetCheckoutUrl":
            integrationWrites.push(args);
            integration.shopifyCheckoutUrl = args.checkoutUrl;
            data = { success: true };
            break;
          case "integrations.n8nUpdate":
            integrationWrites.push(args);
            integration.n8n.webhookUrl = args.webhookUrl;
            data = { success: true };
            break;
          case "team.listMembers":
            data = [
              {
                id: 7,
                name: "Test admin",
                email: "member@example.com",
                role: "admin",
                createdAt: "2026-10-01T00:00:00Z",
              },
            ];
            break;
          case "team.listInvites":
            data = [];
            break;
          case "team.invite":
            invites.push(args);
            data = { token, expiresAt: "2099-01-01T00:00:00Z" };
            break;
          case "team.acceptInvite":
            accepts.push(args);
            if (options.rejectInvite)
              return error(
                "This invitation has expired, was revoked, or has already been used."
              );
            data = { tenantId: 2, role: "user" };
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
    if (
      url.pathname.startsWith("/api/") ||
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      return route.fulfill({ status: 204, body: "" });
    return route.continue();
  });
  return {
    updates,
    customerUpdates,
    accepts,
    invites,
    integrationWrites,
    authenticate: () => {
      signedIn = true;
    },
    orderGets: () => orderGets,
  };
}

test("product corrections persist cleared fields, free pricing and edited inventory after a failed save", async ({
  page,
}) => {
  const calls = await fixture(page, { failProduct: true });
  await page.goto("/products");
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Price *", { exact: true }).fill("0");
  await dialog.getByLabel("Description", { exact: true }).fill("");
  await dialog.getByLabel("Compare-at Price", { exact: true }).fill("");
  await dialog.getByLabel("SKU", { exact: true }).fill("");
  await dialog.getByLabel("Category", { exact: true }).click();
  await page.getByRole("option", { name: "None", exact: true }).click();
  await dialog.getByLabel("Stock Quantity", { exact: true }).fill("7");
  await dialog.getByLabel("Low Stock Alert", { exact: true }).fill("3");
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(
    page.getByText("Product save unavailable. Please retry.", { exact: true })
  ).toBeVisible();
  await expect(
    dialog.getByLabel("Stock Quantity", { exact: true })
  ).toHaveValue("7");
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(calls.updates).toHaveLength(2);
  expect(calls.updates[1]).toEqual(calls.updates[0]);
  expect(calls.updates[1]).toMatchObject({
    price: 0,
    description: "",
    sku: "",
    compareAtPrice: null,
    categoryId: null,
    quantity: 7,
    lowStockThreshold: 3,
  });
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  await expect(
    dialog.getByLabel("Stock Quantity", { exact: true })
  ).toHaveValue("7");
  await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
    ""
  );
  await expect(dialog.getByLabel("Barcode", { exact: true })).toHaveCount(0);
});

test("product validation blocks fractional stock and pay-only edits omit inventory writes", async ({
  page,
}) => {
  const calls = await fixture(page);
  await page.goto("/products");
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Stock Quantity", { exact: true }).fill("2.5");
  await d.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("whole number");
  expect(calls.updates).toHaveLength(0);
  await d.getByLabel("Stock Quantity", { exact: true }).fill("5");
  await d.getByLabel("Price *", { exact: true }).fill("12");
  await d.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(d).not.toBeVisible();
  expect(calls.updates[0]).not.toHaveProperty("quantity");
  expect(calls.updates[0]).not.toHaveProperty("lowStockThreshold");
});

test("customer corrections clear contact fields without dropping address line two", async ({
  page,
}) => {
  const calls = await fixture(page);
  await page.goto("/customers");
  await page
    .getByRole("button", { name: "Edit Alex Worker", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("First Name", { exact: true }).fill("");
  await d.getByLabel("Phone", { exact: true }).fill("");
  await d.getByLabel("Address", { exact: true }).fill("");
  await d.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(d).not.toBeVisible();
  expect(calls.customerUpdates[0]).toMatchObject({
    firstName: "",
    phone: "",
    address: { line1: "", line2: "Unit 4", city: "Portland" },
  });
});

test("saved integration URLs can be cleared and replaced without reverting the draft", async ({
  page,
}) => {
  const calls = await fixture(page);
  await page.goto("/integrations");
  const checkout = page.getByPlaceholder(
    "https://yourstore.myshopify.com/checkout"
  );
  await expect(checkout).toHaveValue("https://shop.example.com/old");
  await checkout.fill("");
  await expect(checkout).toHaveValue("");
  await page
    .getByRole("button", { name: "Save Checkout URL", exact: true })
    .click();
  await expect.poll(() => calls.integrationWrites.length).toBe(1);
  expect(calls.integrationWrites[0]).toEqual({ checkoutUrl: "" });
  const webhook = page.getByPlaceholder("https://n8n.example.com/webhook/...");
  await webhook.fill("");
  await expect(webhook).toHaveValue("");
  await webhook.fill("https://flows.example.com/new");
  await page.getByRole("button", { name: "Save URL", exact: true }).click();
  await expect.poll(() => calls.integrationWrites.length).toBe(2);
  expect(calls.integrationWrites[1]).toEqual({
    webhookUrl: "https://flows.example.com/new",
  });
});

test("direct order detail status changes refresh the visible record", async ({
  page,
}) => {
  const calls = await fixture(page);
  await page.goto("/orders/11");
  const d = page.getByRole("dialog");
  await expect(d.getByText("Order ORDER-11", { exact: true })).toBeVisible();
  await d.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "confirmed", exact: true }).click();
  await expect.poll(calls.orderGets).toBeGreaterThan(1);
  await expect(d.getByRole("combobox").first()).toContainText("confirmed");
});

test("invitation requires explicit confirmation and survives sign-in without token URLs", async ({
  page,
}) => {
  const calls = await fixture(page, { signedIn: false });
  await page.goto(`/join?token=${token}`);
  await expect(
    page.getByRole("link", { name: "Sign in to continue" })
  ).toHaveAttribute("href", "/login?returnTo=%2Fjoin");
  expect(calls.accepts).toHaveLength(0);
  await expect(page).toHaveURL(/\/join$/);
  calls.authenticate();
  await page.goto("/join");
  await expect(
    page.getByRole("button", { name: "Accept invitation", exact: true })
  ).toBeVisible();
  expect(calls.accepts).toHaveLength(0);
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Invitation accepted");
  expect(calls.accepts).toEqual([{ token }]);
  await expect(
    page.getByRole("link", { name: "Open workspace" })
  ).toHaveAttribute("href", "/dashboard");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("unifyone.pending-team-invite")
    )
  ).toBeNull();
});

test("expired invitations show an actionable error without claiming membership changed", async ({
  page,
}) => {
  const calls = await fixture(page, { rejectInvite: true });
  await page.goto(`/accept-invite?token=${token}`);
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await expect(page.getByRole("link", { name: "Open workspace" })).toHaveCount(
    0
  );
  expect(calls.accepts).toHaveLength(1);
});

test("invalid invitation links never call acceptance", async ({ page }) => {
  const calls = await fixture(page);
  await page.goto("/join?token=invalid");
  await expect(page.getByRole("alert")).toContainText("missing or invalid");
  expect(calls.accepts).toHaveLength(0);
});

test("team invite validates email and reports clipboard denial without claiming a copy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Clipboard denied")) },
    });
  });
  const calls = await fixture(page);
  await page.goto("/team");
  await page
    .getByRole("button", { name: "Invite Member", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const email = dialog.getByLabel("Email Address", { exact: true });
  await email.fill("invalid");
  await email.press("Enter");
  await expect(
    page.getByText("Enter a valid email address", { exact: true })
  ).toBeVisible();
  expect(calls.invites).toHaveLength(0);
  await email.fill("new@example.com");
  await dialog
    .getByRole("button", { name: "Generate Invite", exact: true })
    .click();
  await expect(
    dialog.getByText("Invite Created!", { exact: true })
  ).toBeVisible();
  expect(calls.invites).toEqual([{ email: "new@example.com", role: "user" }]);
  await expect(dialog.locator("code")).toContainText(`/join?token=${token}`);
  await dialog
    .getByRole("button", { name: "Copy Invite Link", exact: true })
    .click();
  await expect(
    page.getByText(
      "Could not copy the invite link. Select and copy it manually.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    page.getByText("Invite link copied!", { exact: true })
  ).toHaveCount(0);
});

for (const [path, visibleRecord] of [
  ["/products", "Second-page product"],
  ["/orders", "ORDER-SECOND"],
  ["/customers", "second@example.com"],
]) {
  test(`${path} waits for the next page instead of resetting to page one`, async ({
    page,
  }) => {
    await fixture(page, { paginate: true });
    await page.goto(path);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByText(visibleRecord, { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  });
}
