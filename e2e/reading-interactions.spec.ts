import { test, expect, type Page } from "@playwright/test";
async function mockPublic(page: Page) {
  await page.route("**/api/events**", route => route.abort());
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const data = paths.map(() => ({ result: { data: { json: null } } }));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? data : data[0]
      ),
    });
  });
}
test("reference shell uses dark brand and keyboard outline anchors clear the sticky header", async ({
  page,
}) => {
  await mockPublic(page);
  await page.goto("/architecture");
  const heading = page.locator(".reading-content h1");
  await expect(heading).toBeVisible();
  expect(
    await heading.evaluate(el => getComputedStyle(el).fontFamily)
  ).toContain("Inter");

  const summary = page.locator(".reading-outline summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("navigation", { name: "On this page" })
  ).toBeVisible();
  const anchor = page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Account and data boundaries" });
  await anchor.focus();
  await page.keyboard.press("Enter");
  const target = page.locator("#account-and-data-boundaries");
  await expect(target).toBeFocused();
  await expect
    .poll(async () =>
      target.evaluate(el => Math.round(el.getBoundingClientRect().top))
    )
    .toBeGreaterThanOrEqual(100);
  const ids = await page
    .locator(".reading-content h2")
    .evaluateAll(elements => elements.map(el => el.id));
  expect(new Set(ids).size).toBe(ids.length);
});
test("duplicate generated headings receive unique stable anchors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      document.querySelectorAll(".reading-content h2").forEach(el => {
        if (el.textContent !== "Repeated heading")
          el.textContent = "Repeated heading";
      });
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await mockPublic(page);
  await page.goto("/architecture");
  await expect(page.locator(".reading-outline summary")).toBeVisible();
  const ids = await page
    .locator(".reading-content h2")
    .evaluateAll(elements => elements.map(el => el.id));
  expect(ids[0]).toBe("repeated-heading");
  expect(ids[1]).toBe("repeated-heading-2");
  expect(new Set(ids).size).toBe(ids.length);
});
test("calculator shell keeps the actual 2025 note and readable dark controls on mobile", async ({
  page,
}) => {
  await mockPublic(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/quarterly-tax-estimator");
  await expect(
    page.getByText("2025 calculation basis", { exact: true })
  ).toBeVisible();
  await expect(page.locator(".reading-content h1")).toBeVisible();
  const control = page
    .locator(".reading-content input:not([type=checkbox]):not([type=radio])")
    .first();
  expect(
    await control.evaluate(el => getComputedStyle(el).backgroundColor)
  ).toBe("rgb(17, 20, 22)");
  expect(await control.evaluate(el => getComputedStyle(el).color)).toBe(
    "rgb(244, 242, 237)"
  );
  await control.focus();
  expect(await control.evaluate(el => getComputedStyle(el).outlineStyle)).toBe(
    "solid"
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
});
test("articles and integration references remain readable without horizontal page overflow", async ({
  page,
}) => {
  await mockPublic(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/blog/gig-worker-shift-intelligence",
    "/documents/integrations",
  ]) {
    await page.goto(path);
    await expect(page.locator(".reading-content h1")).toBeVisible();
    expect(
      await page
        .locator(".reading-content h1")
        .evaluate(el => getComputedStyle(el).fontFamily)
    ).toContain("Inter");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
test("tool layout keeps related links and preserves the map-first mobile shell", async ({
  page,
}) => {
  await mockPublic(page);
  await page.goto("/tools/earnings-consolidator");
  await expect(
    page.getByRole("navigation", { name: "Related calculators" })
  ).toBeVisible();
  await expect(page.locator(".marketing-header")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/route-pulse");
  await expect(
    page.getByRole("navigation", { name: "Tool navigation" })
  ).toBeVisible();
  expect(
    await page
      .getByRole("navigation", { name: "Tool navigation" })
      .evaluate(el => Math.round(el.getBoundingClientRect().height))
  ).toBe(44);
  await expect(page.locator(".marketing-header")).toHaveCount(0);
});
