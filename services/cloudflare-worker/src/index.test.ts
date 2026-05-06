import { describe, it, expect } from "vitest";
import { corsHeaders, normalizeMessages } from "./index";

const env = {
  ALLOWED_ORIGINS: "https://1commerce.app, https://www.1commerce.app",
};

function makeRequest(origin?: string): Request {
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  return new Request("https://example.com/chat", { method: "POST", headers });
}

describe("corsHeaders", () => {
  it("reflects an allow-listed origin", () => {
    const h = corsHeaders(makeRequest("https://1commerce.app"), env);
    expect(h["Access-Control-Allow-Origin"]).toBe("https://1commerce.app");
    expect(h["Vary"]).toBe("Origin");
  });

  it("omits Allow-Origin for a disallowed origin", () => {
    const h = corsHeaders(makeRequest("https://evil.example"), env);
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("omits Allow-Origin when no Origin header is present", () => {
    const h = corsHeaders(makeRequest(), env);
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});

describe("normalizeMessages", () => {
  it("wraps a string message and prepends a system prompt", () => {
    const msgs = normalizeMessages({ message: "hello" });
    expect(msgs[0].role).toBe("system");
    expect(msgs.at(-1)).toEqual({ role: "user", content: "hello" });
  });

  it("preserves an existing system prompt", () => {
    const msgs = normalizeMessages({
      messages: [
        { role: "system", content: "custom" },
        { role: "user", content: "hi" },
      ],
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ role: "system", content: "custom" });
  });

  it("returns only the system prompt when nothing is provided", () => {
    const msgs = normalizeMessages({});
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("system");
  });
});
