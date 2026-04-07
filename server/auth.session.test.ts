import { afterAll, describe, expect, it, vi } from "vitest";

const originalEnv = {
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
  APP_URL: process.env.APP_URL,
  URL: process.env.URL,
  DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
  DEPLOY_URL: process.env.DEPLOY_URL,
};

function resetBaseUrlEnv() {
  delete process.env.PUBLIC_APP_URL;
  delete process.env.APP_URL;
  delete process.env.URL;
  delete process.env.DEPLOY_PRIME_URL;
  delete process.env.DEPLOY_URL;
}

describe("auth session env resolution", () => {
  it("prefers PUBLIC_APP_URL when provided", async () => {
    resetBaseUrlEnv();
    process.env.PUBLIC_APP_URL = "https://app.unifyone.com";

    vi.resetModules();
    const { getAppUrl } = await import("./_core/env");

    expect(getAppUrl()).toBe("https://app.unifyone.com");
  });

  it("falls back to APP_URL when PUBLIC_APP_URL is missing", async () => {
    resetBaseUrlEnv();
    process.env.APP_URL = "https://branch.unifyone.com";

    vi.resetModules();
    const { getAppUrl } = await import("./_core/env");

    expect(getAppUrl()).toBe("https://branch.unifyone.com");
  });

  it("falls back to hardcoded URL when no env vars are set", async () => {
    resetBaseUrlEnv();

    vi.resetModules();
    const { getAppUrl } = await import("./_core/env");

    expect(getAppUrl()).toBe("https://1commerce.online");
  });
});

afterAll(() => {
  process.env.PUBLIC_APP_URL = originalEnv.PUBLIC_APP_URL;
  process.env.APP_URL = originalEnv.APP_URL;
  process.env.URL = originalEnv.URL;
  process.env.DEPLOY_PRIME_URL = originalEnv.DEPLOY_PRIME_URL;
  process.env.DEPLOY_URL = originalEnv.DEPLOY_URL;
});
