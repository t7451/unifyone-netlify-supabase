import { expect, test, type Page } from "@playwright/test";

const worker = {
  id: 7,
  tenantId: 1,
  primaryProduct: "gig",
  name: "Sam",
  role: "user",
  emailVerified: true,
  openId: "test-recovery",
};
const starter = {
  id: 1,
  slug: "gig-starter",
  name: "Gig Starter",
  tier: "starter",
  priceMonthly: "0",
  priceYearly: "0",
  monthlyAICredits: 25,
  features: [],
  description: "Record work",
};
async function fixture(page: Page) {
  const failures = new Set<string>();
  const calls: { path: string; input: Record<string, unknown> }[] = [];
  let domain = "work.example.com";
  let logoUrl = "https://example.com/logo.png";
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/trpc/")) {
      const paths = url.pathname.split("/api/trpc/")[1].split(",");
      const body =
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : JSON.parse(url.searchParams.get("input") || "{}");
      const responses = paths.map((path, index) => {
        const input = body?.[index]?.json ?? body?.json ?? {};
        calls.push({ path, input });
        if (failures.has(path))
          return {
            error: {
              json: {
                message: "Temporary service failure",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path },
              },
            },
          };
        let data: unknown = null;
        if (path === "auth.me") data = worker;
        if (path === "tenant.list")
          data = [
            { id: 2, name: "Other workspace", primaryProduct: "commerce" },
            {
              id: 1,
              name: "Current workspace",
              slug: "current",
              primaryProduct: "gig",
              domain,
              logoUrl,
            },
          ];
        if (path === "tenant.update") {
          if (typeof input.domain === "string") domain = input.domain;
          if (typeof input.logoUrl === "string") logoUrl = input.logoUrl;
          data = { success: true };
        }
        if (path === "notifications.list")
          data = [
            {
              id: 11,
              title: "A real work update",
              body: "Recorded activity",
              type: "info",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ];
        if (path === "notifications.unreadCount") data = { count: 1 };
        if (
          path === "notifications.listAnnouncements" ||
          path === "subscription.getInvoices"
        )
          data = [];
        if (path === "subscription.getStatus")
          data = {
            status: "none",
            plan: null,
            stripeCustomerId: null,
            trialDaysLeft: null,
          };
        if (path === "tenant.getUsage")
          data = { productCount: 0, orderCount: 0, userCount: 1 };
        if (path === "gigWorker.getPlans")
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
            },
          ];
        if (path === "gigWorker.getSubscription")
          data = {
            plan: starter,
            aiUsage: { requestsUsed: 0 },
            aiCreditsRemaining: 25,
          };
        if (path === "notifications.listTriggers") data = [];
        if (path === "apiKeys.list") data = { keys: [] };
        if (path === "tenant.getOAuthSettings")
          data = {
            google: {
              enabled: false,
              clientId: "",
              redirectUri: "",
              scopes: "email profile",
            },
          };
        if (path === "user.getPreferences")
          data = {
            theme: "dark",
            language: "en",
            timezone: "UTC",
            emailNotifications: true,
          };
        if (path === "user.updatePreferences") data = { success: true };
        return { result: { data: { json: data } } };
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responses),
      });
    }
    if (
      url.pathname.startsWith("/api/") ||
      (url.origin !== new URL(page.url() || "http://127.0.0.1:3012").origin &&
        !["127.0.0.1", "localhost"].includes(url.hostname))
    )
      return route.abort();
    return route.continue();
  });
  return { failures, calls };
}

test("notification list retries a failure and reports failed actions without losing the row", async ({
  page,
}) => {
  const { failures } = await fixture(page);
  failures.add("notifications.list");
  await page.goto("/notifications");
  await expect(page.getByText("Could not load notifications")).toBeVisible();
  await expect(page.getByText("All caught up!", { exact: true })).toHaveCount(
    0
  );
  failures.delete("notifications.list");
  await page.getByRole("button", { name: "Retry notifications" }).click();
  await expect(page.getByText("A real work update")).toBeVisible();
  failures.add("notifications.markAllRead");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(
    page.getByText("Temporary service failure").last()
  ).toBeVisible();
  await expect(page.getByText("A real work update")).toBeVisible();
});

test("notification bell distinguishes an unavailable list from no notifications", async ({
  page,
}) => {
  const { failures } = await fixture(page);
  failures.add("notifications.list");
  await page.goto("/settings/account");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Notification list" });
  await expect(panel.getByText("Could not load notifications")).toBeVisible();
  failures.delete("notifications.list");
  await panel.getByRole("button", { name: "Retry notifications" }).click();
  await expect(panel.getByText("A real work update")).toBeVisible();
});

test("billing retries subscription and invoice failures without showing a false empty invoice history", async ({
  page,
}) => {
  const { failures, calls } = await fixture(page);
  failures.add("subscription.getStatus");
  failures.add("subscription.getInvoices");
  await page.goto("/billing");
  await expect(
    page.getByText("Could not load your subscription")
  ).toBeVisible();
  failures.delete("subscription.getStatus");
  await page.getByRole("button", { name: "Retry subscription" }).click();
  await expect(page.getByText("Could not load invoice history")).toBeVisible();
  await expect(page.getByText("No invoices yet", { exact: true })).toHaveCount(
    0
  );
  failures.delete("subscription.getInvoices");
  await page.getByRole("button", { name: "Retry invoices" }).click();
  await expect(
    page.getByText("No invoices yet", { exact: true })
  ).toBeVisible();
  expect(
    calls.filter(call => call.path.includes("createCheckout"))
  ).toHaveLength(0);
});

test("plan selection waits for a verified subscription and keeps failed checkout recoverable", async ({
  page,
}) => {
  const { failures, calls } = await fixture(page);
  failures.add("gigWorker.getSubscription");
  await page.goto("/gig-worker-plans");
  await expect(
    page.getByText("Could not load plans and subscription")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upgrade to Gig Pro" })
  ).toHaveCount(0);
  failures.delete("gigWorker.getSubscription");
  await page.getByRole("button", { name: "Retry plans" }).click();
  failures.add("gigWorker.createCheckout");
  await page.getByRole("button", { name: "Upgrade to Gig Pro" }).click();
  await expect(
    page.getByText("Temporary service failure").last()
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upgrade to Gig Pro" })
  ).toBeEnabled();
  expect(
    calls.filter(call => call.path === "gigWorker.createCheckout")
  ).toHaveLength(1);
  await expect(page).toHaveURL(/gig-worker-plans$/);
});

test("workspace settings save cleared optional fields for the active workspace, retaining values after failure", async ({
  page,
}) => {
  const { failures, calls } = await fixture(page);
  await page.goto("/settings");
  await expect(page.locator('input[value="Current workspace"]')).toBeVisible();
  const domain = page.getByPlaceholder("shop.yourdomain.com");
  const logo = page.getByPlaceholder("https://example.com/logo.png");
  await domain.fill("");
  await logo.fill("");
  failures.add("tenant.update");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByText("Temporary service failure").last()
  ).toBeVisible();
  await expect(domain).toHaveValue("");
  await expect(logo).toHaveValue("");
  failures.delete("tenant.update");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByText("Settings saved", { exact: true })).toBeVisible();
  const updates = calls.filter(call => call.path === "tenant.update");
  expect(updates).toHaveLength(2);
  expect(updates[1].input).toEqual({ id: 1, domain: "", logoUrl: "" });
});

test("preferences retry loading and a failed theme save preserves the saved display setting", async ({
  page,
}) => {
  const { failures } = await fixture(page);
  failures.add("user.getPreferences");
  await page.goto("/settings/appearance");
  await expect(page.getByText("Failed to load preferences")).toBeVisible();
  failures.delete("user.getPreferences");
  await page.getByRole("button", { name: "Retry preferences" }).click();
  failures.add("user.updatePreferences");
  await page.getByRole("button", { name: /Light/ }).click();
  await expect(
    page.getByText("Temporary service failure").last()
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
});

test("API key loading failures do not imply no key is configured", async ({
  page,
}) => {
  const { failures } = await fixture(page);
  failures.add("apiKeys.list");
  await page.goto("/settings/api-keys");
  await expect(page.getByText("Could not load your API keys")).toBeVisible();
  const key = page.getByPlaceholder("sk-or-v1-…");
  await key.fill("sk-or-v1-a-long-enough-test-key");
  await expect(page.getByRole("button", { name: /Save.*key/i })).toBeDisabled();
  failures.delete("apiKeys.list");
  await page.getByRole("button", { name: "Retry API keys" }).click();
  await expect(page.getByRole("button", { name: /Save.*key/i })).toBeEnabled();
});

test("OAuth settings cannot save unverified defaults when their load failed", async ({
  page,
}) => {
  const { failures, calls } = await fixture(page);
  failures.add("tenant.getOAuthSettings");
  await page.goto("/settings/advanced");
  await expect(
    page.getByText("Could not load Google OAuth settings")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Google OAuth" })
  ).toHaveCount(0);
  failures.delete("tenant.getOAuthSettings");
  await page.getByRole("button", { name: "Retry OAuth settings" }).click();
  await expect(
    page.getByRole("button", { name: "Save Google OAuth" })
  ).toBeEnabled();
  expect(
    calls.filter(call => call.path === "tenant.updateOAuthSettings")
  ).toHaveLength(0);
});

test("notification triggers require a loaded configuration before showing save controls", async ({
  page,
}) => {
  const { failures, calls } = await fixture(page);
  failures.add("notifications.listTriggers");
  await page.goto("/notifications");
  await page.getByRole("tab", { name: "Triggers", exact: true }).click();
  await expect(
    page.getByText("Could not load trigger configuration")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save", exact: true })
  ).toHaveCount(0);
  failures.delete("notifications.listTriggers");
  await page.getByRole("button", { name: "Retry triggers" }).click();
  await expect(page.getByText("Event Trigger Configuration")).toBeVisible();
  expect(
    calls.filter(call => call.path === "notifications.upsertTrigger")
  ).toHaveLength(0);
});
