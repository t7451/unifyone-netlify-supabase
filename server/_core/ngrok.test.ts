import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveKaiMcpUrl } from "./ngrok";

describe("resolveKaiMcpUrl", () => {
  const saved: Record<string, string | undefined> = {};
  const keys = ["KAI_MCP_NGROK_URL", "MCP_WORKER_URL", "NODE_ENV"] as const;

  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
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
