import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveKaiMcpUrl } from "./ngrok";

describe("resolveKaiMcpUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.KAI_MCP_NGROK_URL;
    delete process.env.MCP_WORKER_URL;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns KAI_MCP_NGROK_URL when set outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.KAI_MCP_NGROK_URL = "https://kai.ngrok.app";
    process.env.MCP_WORKER_URL = "https://prod.example.com";
    expect(resolveKaiMcpUrl()).toBe("https://kai.ngrok.app");
  });

  it("ignores KAI_MCP_NGROK_URL in production", () => {
    process.env.NODE_ENV = "production";
    process.env.KAI_MCP_NGROK_URL = "https://kai.ngrok.app";
    process.env.MCP_WORKER_URL = "https://prod.example.com";
    expect(resolveKaiMcpUrl()).toBe("https://prod.example.com");
  });

  it("falls back to MCP_WORKER_URL when KAI_MCP_NGROK_URL is unset", () => {
    process.env.NODE_ENV = "development";
    process.env.MCP_WORKER_URL = "https://prod.example.com";
    expect(resolveKaiMcpUrl()).toBe("https://prod.example.com");
  });

  it("returns undefined when neither is set", () => {
    process.env.NODE_ENV = "development";
    expect(resolveKaiMcpUrl()).toBeUndefined();
  });
});
