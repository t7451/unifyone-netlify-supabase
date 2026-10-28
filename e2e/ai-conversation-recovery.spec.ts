import { test, expect, type Page } from "@playwright/test";

async function fixture(page: Page) {
  const chats: Record<string, unknown>[] = [];
  const pending = new Map<number, () => void>();
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const input =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : JSON.parse(url.searchParams.get("input") ?? "{}");
    const responses = await Promise.all(
      url.pathname
        .split("/api/trpc/")[1]
        .split(",")
        .map(async (path, index) => {
          const args = input?.[index]?.json ?? input?.json ?? {};
          let data: unknown = null;
          if (path === "auth.me")
            data = {
              id: 7,
              tenantId: 1,
              primaryProduct: "gig",
              name: "Example worker",
              role: "user",
              emailVerified: true,
            };
          if (path === "tenant.list")
            data = [
              { id: 1, name: "Example workspace", primaryProduct: "gig" },
            ];
          if (path === "notifications.list") data = [];
          if (path === "notifications.unreadCount") data = { count: 0 };
          if (path === "ai.getSuggestions") data = { suggestions: [] };
          if (path === "apiKeys.list") data = { keys: [] };
          if (path === "ai.listModels") data = { models: [] };
          if (path === "kaiCredits.getBalance")
            data = { remaining: 25, transactions: [] };
          if (path === "kaiCredits.listPackages") data = { packages: [] };
          if (path === "ai.listConversations")
            data = {
              conversations: [
                { id: 11, title: "First saved chat", context: "general" },
                { id: 12, title: "Second saved chat", context: "friends" },
              ],
            };
          if (path === "ai.getConversation") {
            await new Promise<void>(resolve => pending.set(args.id, resolve));
            data = {
              conversation: {
                id: args.id,
                context: args.id === 11 ? "general" : "friends",
                messages: [
                  { role: "assistant", content: `Saved reply ${args.id}` },
                ],
              },
            };
          }
          if (path === "ai.chat") {
            chats.push(args);
            data = { conversationId: 99, reply: "Recorded test response" };
          }
          if (path === "ai.deleteConversation")
            return {
              error: {
                json: {
                  message: "Delete unavailable",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path,
                  },
                },
              },
            };
          return { result: { data: { json: data } } };
        })
    );
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  await page.goto("/ai-assistant");
  await expect(
    page.getByRole("button", { name: "First saved chat", exact: true })
  ).toBeVisible();
  const consent = page.getByRole("button", {
    name: "Essentials only",
    exact: true,
  });
  if (await consent.isVisible()) await consent.click();
  return { chats, pending };
}

test("context selection reaches the chat request and failed deletion preserves the open conversation", async ({
  page,
}) => {
  const { chats, pending } = await fixture(page);
  await page
    .getByRole("button", { name: "Money Manager", exact: true })
    .click();
  await page
    .getByPlaceholder(/Ask Kai anything about your/)
    .fill("Review my recorded work");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => chats.length).toBe(1);
  expect(chats[0].context).toBe("money-manager");
  await expect(
    page.getByText("Recorded test response", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "First saved chat", exact: true })
    .click();
  await expect.poll(() => pending.has(11)).toBe(true);
  pending.get(11)!();
  await expect(page.getByText("Saved reply 11", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Delete First saved chat", exact: true })
    .click();
  await expect(
    page.getByText(
      "Conversation could not be deleted. Your chat is still open."
    )
  ).toBeVisible();
  await expect(page.getByText("Saved reply 11", { exact: true })).toBeVisible();
});

test("a late history response cannot replace the latest selection or a new chat", async ({
  page,
}) => {
  const { pending } = await fixture(page);
  await page
    .getByRole("button", { name: "First saved chat", exact: true })
    .click();
  await expect.poll(() => pending.has(11)).toBe(true);
  await page
    .getByRole("button", { name: "Second saved chat", exact: true })
    .click();
  await expect.poll(() => pending.has(12)).toBe(true);
  pending.get(12)!();
  await expect(page.getByText("Saved reply 12", { exact: true })).toBeVisible();
  pending.get(11)!();
  await expect(page.getByText("Saved reply 11", { exact: true })).toHaveCount(
    0
  );
  await page.getByRole("button", { name: "New Chat", exact: true }).click();
  await expect(page.getByText("Saved reply 12", { exact: true })).toHaveCount(
    0
  );
  await expect(
    page.getByText("General context", { exact: true })
  ).toBeVisible();
});
