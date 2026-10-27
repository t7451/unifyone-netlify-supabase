import { expect, test, type Page } from "@playwright/test";

async function publicFixture(page: Page) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const results = paths.map(() => ({ result: { data: { json: null } } }));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? results : results[0]
      ),
    });
  });
}
async function open(page: Page, path: string) {
  await page.goto(path);
  const essentials = page.getByRole("button", {
    name: "Essentials only",
    exact: true,
  });
  if (await essentials.isVisible()) await essentials.click();
}

test("tool search covers descriptions and audiences and resets focus with Escape or Clear", async ({
  page,
}) => {
  await publicFixture(page);
  await open(page, "/tools");
  const library = page.getByRole("region", { name: "Browse free tools" });
  const search = page.getByRole("searchbox", { name: "Search free tools" });
  await expect(library.getByRole("status")).toHaveText("9 tools of 9");
  await search.fill("returns rate");
  await expect(library.getByRole("status")).toHaveText("1 tool of 9");
  await expect(library.getByRole("link")).toHaveAttribute(
    "href",
    "/tools/reseller-break-even"
  );
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await search.fill("multiple income streams");
  await expect(library.getByRole("link")).toHaveAttribute(
    "href",
    "/tools/earnings-consolidator"
  );
  await search.fill("no-such-calculator");
  await expect(
    library.getByRole("heading", { name: "No matching tools." })
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(library.getByRole("status")).toHaveText("9 tools of 9");
});

test("guide category buttons combine with search and reset all active filters on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await publicFixture(page);
  await open(page, "/resources");
  const library = page.getByRole("region", { name: "Browse guides" });
  const search = page.getByRole("searchbox", { name: "Search guides" });
  const money = library.getByRole("button", { name: "Money", exact: true });
  await money.focus();
  await money.press("Enter");
  await expect(money).toHaveAttribute("aria-pressed", "true");
  await expect(library.getByRole("status")).toHaveText("4 guides of 10");
  await search.fill("bookkeeping");
  await expect(library.getByRole("status")).toHaveText("1 guide of 10");
  await expect(library.getByRole("link")).toHaveAttribute(
    "href",
    "/gig-worker-bookkeeping"
  );
  await search.press("Escape");
  await expect(money).toHaveAttribute("aria-pressed", "true");
  await expect(library.getByRole("status")).toHaveText("4 guides of 10");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(search).toBeFocused();
  await expect(
    library.getByRole("button", { name: "All guides", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await search.fill("getting started");
  await expect(library.getByRole("status")).toHaveText("2 guides of 10");
  await search.fill("nothing-matches-this");
  await expect(
    library.getByRole("heading", { name: "No matching guides yet." })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(library.getByRole("status")).toHaveText("10 guides of 10");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("documentation and articles expose searchable real links and recover from empty results", async ({
  page,
}) => {
  await publicFixture(page);
  await open(page, "/documents");
  const search = page.getByRole("searchbox", { name: "Search documentation" });
  await search.fill("webhooks");
  await expect(
    page.locator("#document-results").getByRole("link")
  ).toHaveAttribute("href", "/documents/integrations");
  await expect(page.getByRole("status")).toHaveText("1 reference of 7");
  await search.fill("missing-document-xyz");
  await expect(
    page.getByRole("heading", { name: "No matching references." })
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toBeFocused();
  await search.press("Tab");
  await expect(
    page.locator("#document-results").getByRole("link").first()
  ).toBeFocused();
  await open(page, "/blog");
  const articles = page.getByRole("searchbox", { name: "Search articles" });
  await articles.fill("tenant-safe");
  await expect(page.getByRole("status")).toHaveText("1 article of 3");
  await expect(
    page.locator("#article-results").getByRole("link")
  ).toHaveAttribute("href", /\/blog\//);
  await articles.fill("missing-article-xyz");
  await expect(
    page.getByRole("heading", { name: "No matching articles." })
  ).toBeVisible();
  await articles.press("Escape");
  await expect(articles).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("3 articles of 3");
});
