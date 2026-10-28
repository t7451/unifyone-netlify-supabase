import { expect, test, type Page } from "@playwright/test";

type SetupOptions = {
  failCreate?: boolean;
  failSeed?: boolean;
  existing?: boolean;
};
async function setupFixture(page: Page, options: SetupOptions = {}) {
  let created = options.existing ?? false;
  let product = "gig";
  const creates: Record<string, unknown>[] = [];
  let seeds = 0;
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const body =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : null;
    let responseStatus = 200;
    const responses = paths.map((path, index) => {
      const args = body?.[index]?.json ?? body?.json ?? {};
      let data: unknown = null;
      if (path === "auth.me")
        data = {
          id: 7,
          tenantId: created ? 1 : null,
          primaryProduct: product,
          name: "Sam",
          role: "user",
          openId: "test-worker",
          emailVerified: true,
        };
      if (path === "tenant.list")
        data = created
          ? [{ id: 1, name: "Sam's work", primaryProduct: product }]
          : [];
      if (path === "tenant.create") {
        creates.push(args);
        if (options.failCreate) {
          responseStatus = 400;
          return {
            error: {
              json: {
                message: "That identifier is already taken. Try another.",
                code: -32600,
                data: { code: "BAD_REQUEST", httpStatus: 400, path },
              },
            },
          };
        }
        created = true;
        product = args.primaryProduct;
        data = {
          id: 1,
          name: args.name,
          slug: args.slug,
          primaryProduct: product,
        };
      }
      if (path === "tenant.seedDemoData") {
        seeds++;
        if (options.failSeed) {
          responseStatus = 500;
          return {
            error: {
              json: {
                message: "Sample setup failed",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
              },
            },
          };
        }
        data = { productsCreated: 3 };
      }
      if (path === "notifications.list") data = [];
      if (path === "notifications.unreadCount") data = { count: 0 };
      if (path === "ai.getSuggestions") data = [];
      if (path === "products.list") data = { products: [], total: 0 };
      return { result: { data: { json: data } } };
    });
    await route.fulfill({
      status: responseStatus,
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  return { creates, seeds: () => seeds };
}

test("creates a worker workspace in one step without seeding commerce records", async ({
  page,
}) => {
  const fixture = await setupFixture(page);
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Make your work add up" })
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: /My work and earnings/ })
  ).toBeChecked();
  await expect(
    page.getByText("Delivery, rideshare, freelance—or a mix.", { exact: false })
  ).toBeVisible();
  await expect(page.getByLabel("Workspace name")).toHaveValue("Sam's work");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  expect(fixture.creates).toEqual([
    { name: "Sam's work", slug: "sams-work", primaryProduct: "gig" },
  ]);
  expect(fixture.seeds()).toBe(0);
});

test("shows a recoverable creation error without advancing to fake success", async ({
  page,
}) => {
  const fixture = await setupFixture(page, { failCreate: true });
  await page.goto("/setup");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("already taken");
  await expect(page.getByLabel("Identifier", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/setup$/);
  expect(fixture.creates).toHaveLength(1);
  expect(fixture.seeds()).toBe(0);
});

test("keeps storefront sample products optional and lets people skip a failed sample setup", async ({
  page,
}) => {
  const fixture = await setupFixture(page, { failSeed: true });
  await page.goto("/setup");
  await page.getByRole("radio", { name: /A storefront/ }).check();
  await page.getByRole("button", { name: "Continue with storefront" }).click();
  await expect(
    page.getByRole("heading", { name: "Your storefront workspace is ready" })
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Add sample products" }).check();
  await page.getByRole("button", { name: "Open my storefront" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "sample products could not be added"
  );
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByRole("button", { name: "Skip sample products" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(fixture.creates).toHaveLength(1);
  expect(fixture.seeds()).toBe(1);
});

test("does not create another workspace when an existing worker opens setup", async ({
  page,
}) => {
  const fixture = await setupFixture(page, { existing: true });
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Your workspace is already ready" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  expect(fixture.creates).toHaveLength(0);
});

test("add past earnings opens the promised statement import view", async ({
  page,
}) => {
  const fixture = await setupFixture(page);
  await page.goto("/setup");
  await page.getByRole("radio", { name: /Add past earnings/ }).check();
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/money-manager\?tab=import$/);
  expect(fixture.creates).toHaveLength(1);
  expect(fixture.seeds()).toBe(0);
});
