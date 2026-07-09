import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The app serves the client AND the API together on a single port: `pnpm dev`
// runs Express with Vite middleware (there is no separate Vite port).
const PORT = 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

// Some CI/sandbox containers pre-provision a Chromium build at a fixed path
// (with PLAYWRIGHT_BROWSERS_PATH pointing at it). When the pinned
// @playwright/test version expects a different browser revision, resolution
// fails — fall back to the pre-installed binary when it exists. On normal
// dev machines this path is absent and Playwright resolves its own browser.
const preinstalledChromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 1,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    ...(existsSync(preinstalledChromium)
      ? { launchOptions: { executablePath: preinstalledChromium } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the dev server automatically unless PLAYWRIGHT_BASE_URL points at
  // an already-running instance (e.g. on a non-default port).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        port: PORT,
        reuseExistingServer: true,
        timeout: 120000,
        env: {
          PORT: String(PORT),
          // Startup requires a >=32-char JWT_SECRET even in DB-less dev mode.
          // This is test-only filler, NOT a real secret — never reuse it.
          JWT_SECRET:
            process.env.JWT_SECRET ||
            "e2e-only-fake-jwt-secret-do-not-use-0000000000",
        },
      },
});
