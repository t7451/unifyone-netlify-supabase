import { test, expect, type Page } from "@playwright/test";

async function sessionFixture(page: Page) {
  const state = {
    sessionFailed: false,
    workspaceFailed: false,
    logoutFailed: false,
    signedOut: false,
    logoutCalls: 0,
  };
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/auth/logout", async route => {
    state.logoutCalls += 1;
    if (!state.logoutFailed) state.signedOut = true;
    await route.fulfill({
      status: state.logoutFailed ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify({ success: !state.logoutFailed }),
    });
  });
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const responses = url.pathname
      .split("/api/trpc/")[1]
      .split(",")
      .map(path => {
        if (
          (path === "auth.me" && state.sessionFailed) ||
          (path === "tenant.list" && state.workspaceFailed)
        )
          return {
            error: {
              json: {
                message: "Temporarily unavailable",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 503, path },
              },
            },
          };
        let data: unknown = null;
        if (path === "auth.me" && !state.signedOut)
          data = {
            id: 7,
            tenantId: 1,
            primaryProduct: "gig",
            name: "Example Worker",
            email: "worker@example.com",
            role: "user",
            emailVerified: true,
          };
        if (path === "tenant.list")
          data = [{ id: 1, name: "Example workspace", primaryProduct: "gig" }];
        if (path === "notifications.list") data = [];
        if (path === "notifications.unreadCount") data = { count: 0 };
        if (path === "ai.getSuggestions") data = { suggestions: [] };
        return { result: { data: { json: data } } };
      });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  return state;
}

test("session and workspace failures retry without redirecting an existing account into setup", async ({
  page,
}) => {
  const state = await sessionFixture(page);
  state.sessionFailed = true;
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Your session could not be checked" })
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/settings");
  state.sessionFailed = false;
  state.workspaceFailed = true;
  await page
    .getByRole("button", { name: "Retry session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your workspace could not be loaded" })
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/settings");
  state.workspaceFailed = false;
  await page
    .getByRole("button", { name: "Retry workspace", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open settings for Example workspace" })
  ).toBeVisible();
});

test("sign-out calls the cookie endpoint and a failed attempt keeps the session recoverable", async ({
  page,
}) => {
  const state = await sessionFixture(page);
  state.logoutFailed = true;
  await page.goto("/settings");
  const consent = page.getByRole("button", {
    name: "Essentials only",
    exact: true,
  });
  if (await consent.isVisible()) await consent.click();
  const account = page
    .getByRole("button")
    .filter({ hasText: "worker@example.com" });
  await account.click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByText("Sign out could not be confirmed. Please try again.")
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/settings");
  state.logoutFailed = false;
  await account.click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.logoutCalls).toBe(2);
});
