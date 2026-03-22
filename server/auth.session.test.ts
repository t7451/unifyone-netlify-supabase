import { afterAll, describe, expect, it, vi } from "vitest";
import type { Request } from "express";

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

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    protocol: "https",
    headers: {},
    get: vi.fn((header: string) => {
      if (header.toLowerCase() === "host") return "unifyone.example.com";
      return undefined;
    }),
    header: vi.fn((header: string) => {
      if (header.toLowerCase() === "x-forwarded-proto") return "https";
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
}

describe("auth session redirect uri", () => {
  it("prefers configured base url when provided", async () => {
    resetBaseUrlEnv();
    process.env.PUBLIC_APP_URL = "https://app.unifyone.com";

    vi.resetModules();
    const { buildRedirectUri } = await import("./_core/sdk");

    expect(buildRedirectUri(makeRequest())).toBe(
      "https://app.unifyone.com/api/oauth/callback"
    );
  });

  it("falls back to request host when no base url is configured", async () => {
    resetBaseUrlEnv();

    vi.resetModules();
    const { buildRedirectUri } = await import("./_core/sdk");

    expect(buildRedirectUri(makeRequest())).toBe(
      "https://unifyone.example.com/api/oauth/callback"
    );
  });

  it("throws when host is missing and no base url override exists", async () => {
    resetBaseUrlEnv();

    vi.resetModules();
    const { buildRedirectUri } = await import("./_core/sdk");

    expect(() =>
      buildRedirectUri(
        makeRequest({
          get: vi.fn(() => undefined),
        })
      )
    ).toThrow("Missing host header for OAuth callback");
  });
});

afterAll(() => {
  process.env.PUBLIC_APP_URL = originalEnv.PUBLIC_APP_URL;
  process.env.APP_URL = originalEnv.APP_URL;
  process.env.URL = originalEnv.URL;
  process.env.DEPLOY_PRIME_URL = originalEnv.DEPLOY_PRIME_URL;
  process.env.DEPLOY_URL = originalEnv.DEPLOY_URL;
});