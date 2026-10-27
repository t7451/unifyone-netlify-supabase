import { expect, test, type Page } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/the-system",
  "/contact",
  "/tools",
  "/resources",
  "/documents",
  "/blog",
  "/blog/gig-ecommerce",
  "/privacy",
  "/terms",
  "/tools/gig-hourly-rate",
  "/tools/mileage-deduction-calculator",
  "/404",
];

const ADDITIONAL_PUBLIC_ROUTES = [
  "/seo",
  "/affiliate-program",
  "/best-mileage-tracking-apps",
  "/sovereign",
  "/themes",
  "/components",
  "/video-production",
  "/marketing/ad-copy",
  "/clips",
  "/press",
  "/tithes",
  "/docs-chat",
  "/chat",
  "/design-system",
];

async function isolatePublicRequests(page: Page, baseURL: string) {
  const appOrigin = new URL(baseURL).origin;
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/trpc/")) {
      const calls = url.pathname.split("/api/trpc/")[1].split(",");
      const responses = calls.map(name => ({
        result: {
          data: {
            json:
              name === "themes.list"
                ? []
                : name === "sovereign.getCount"
                  ? { count: 0 }
                  : null,
          },
        },
      }));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          url.searchParams.get("batch") === "1" ? responses : responses[0]
        ),
      });
    }
    // Public layout verification must not reach a database, send analytics, or
    // depend on external services. Local images/styles still load normally.
    if (url.pathname.startsWith("/api/") || url.origin !== appOrigin) {
      return route.fulfill({ status: 204, body: "" });
    }
    return route.continue();
  });
}

test.beforeEach(async ({ page, baseURL }) => {
  await isolatePublicRequests(page, baseURL ?? "http://localhost:3000");
});

for (const width of [320, 390, 768, 1440]) {
  test.describe(`public pages at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    const paths =
      width === 390
        ? [...PUBLIC_ROUTES, ...ADDITIONAL_PUBLIC_ROUTES]
        : width === 320
          ? [...PUBLIC_ROUTES, "/components", "/video-production"]
          : PUBLIC_ROUTES;
    for (const path of paths) {
      test(`${path} has a complete, usable shared shell`, async ({ page }) => {
        const browserErrors: string[] = [];
        const missingAssets: string[] = [];
        page.on("pageerror", error => browserErrors.push(error.message));
        page.on("console", message => {
          if (message.type() === "error") browserErrors.push(message.text());
        });
        page.on("response", response => {
          if (response.status() >= 400) missingAssets.push(response.url());
        });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByRole("main")).toHaveCount(1);
        await expect(
          page.getByRole("navigation", { name: "Main navigation", exact: true })
        ).toHaveCount(1);
        await expect(
          page.getByRole("link", { name: "UnifyOne home", exact: true })
        ).toHaveAttribute("href", "/");
        await expect(
          page
            .getByRole("link", { name: "UnifyOne home", exact: true })
            .locator('svg[data-brand-mark="unifyone"]')
        ).toHaveCount(1);
        await expect(page.locator("footer.marketing-footer")).toHaveCount(1);
        if (!ADDITIONAL_PUBLIC_ROUTES.includes(path))
          await expect(page).toHaveTitle(/UnifyOne/);
        if (path !== "/404")
          await expect(page).not.toHaveTitle(/^404|page not found/i);
        const images = page.locator("img");
        for (let index = 0; index < (await images.count()); index++) {
          await images.nth(index).scrollIntoViewIfNeeded();
        }
        await page.locator("footer.marketing-footer").scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            page.locator("img").evaluateAll(images =>
              images.every(image => {
                const element = image as HTMLImageElement;
                return element.complete && element.naturalWidth > 0;
              })
            )
          )
          .toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        ).toBe(true);
        expect(missingAssets).toEqual([]);
        expect(browserErrors).toEqual([]);
      });
    }
  });
}

test("mobile navigation can be dismissed, reopened and used from a reading page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/privacy");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  await expect(
    page.getByRole("button", { name: "Close navigation" })
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page
    .locator("#marketing-mobile-menu")
    .getByRole("link", { name: "Free tools", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(
    page.getByRole("button", { name: "Open navigation" })
  ).toHaveAttribute("aria-expanded", "false");
});

test("keyboard users can skip the shared navigation on a long article", async ({
  page,
}) => {
  await page.goto("/blog/gig-ecommerce");
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("contact failure preserves the message and offers a retry without sending externally", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/trpc/**", route => {
    const url = new URL(route.request().url());
    const responses = url.pathname
      .split("/api/trpc/")[1]
      .split(",")
      .map(name => {
        if (name !== "contact.send")
          return { result: { data: { json: null } } };
        attempts++;
        return {
          result: {
            data: {
              json: {
                success: false,
                message: "Support is temporarily unavailable. Please retry.",
              },
            },
          },
        };
      });
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0]
      ),
    });
  });
  await page.goto("/contact");
  await page.getByLabel("Your name", { exact: true }).fill("Example Worker");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("worker@example.com");
  const message = page.getByRole("textbox", {
    name: "Your message",
    exact: true,
  });
  await message.fill("I need help finding my work records.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Please retry");
  await expect(message).toHaveValue("I need help finding my work records.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => attempts).toBe(2);
});

test("an unknown address keeps the shared recovery navigation and stays out of search", async ({
  page,
}) => {
  await page.goto("/public-consistency-missing-page");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "back on track"
  );
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]')
  ).toHaveAttribute("content", /noindex/);
  await page.getByRole("link", { name: /^Go home/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation", exact: true })
  ).toBeVisible();
});

test("guide search can recover from an empty result", async ({ page }) => {
  await page.goto("/seo");
  const search = page.getByRole("searchbox", {
    name: "Search guides",
    exact: true,
  });
  const guides = page.getByRole("link", { name: /Read the guide/ });
  await expect(guides.first()).toBeVisible();
  const initialCount = await guides.count();
  await search.fill("no-matching-guide-000000");
  await expect(
    page.getByRole("heading", {
      name: "No guides match that search.",
      exact: true,
    })
  ).toBeVisible();
  await expect(guides).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show all guides", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(guides).toHaveCount(initialCount);
});

test("mobile navigation supports signup, outside dismissal, and desktop resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  const panel = page.locator("#marketing-mobile-menu");
  await expect(
    panel.getByRole("link", { name: "How it works", exact: true })
  ).toBeFocused();
  await expect(
    panel.getByRole("link", { name: "Start free", exact: true })
  ).toHaveAttribute("href", /\/register/);
  await page.mouse.click(4, 850);
  await expect(panel).toHaveCount(0);
  await toggle.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(panel).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await panel.getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(panel).toHaveCount(0);
});

test("public portal theme is cleaned up on the standalone sign-in screen", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-public-brand",
    "unifyone"
  );
  await page
    .getByRole("link", { name: "Sign in", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-public-brand",
    "unifyone"
  );
  await expect(
    page.locator('svg[data-brand-mark="unifyone"]').first()
  ).toBeAttached();
});

test("installed-app and press identity assets are available with a single product name", async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.short_name).toBe("UnifyOne");
  for (const src of new Set<string>(
    manifest.icons.map((icon: { src: string }) => icon.src)
  )) {
    const response = await request.get(src);
    expect(response.ok(), src).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\//);
  }
  await page.goto("/press");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const logo = page.locator('img[src="/press/unifyone-logo.svg"]');
  await expect(logo).toBeAttached();
  await expect
    .poll(() =>
      logo.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0
      )
    )
    .toBe(true);
});
