import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./env", () => ({
  ENV: {
    forgeApiKey: "forge-test-key",
    groqApiKey: "groq-test-key",
    vercelOidcToken: "vercel-oidc-test-token",
    openRouterApiKey: "sk-or-test-key",
    openRouterModel: "",
    openRouterApiUrl: "",
  },
  getAppUrl: () => "https://1commerce.online",
}));

vi.mock("../creditMeter", () => ({
  meterCredits: vi.fn().mockResolvedValue({
    success: true,
    balanceAfter: 0,
    overageCredits: 0,
    eventId: null,
  }),
  tokensToCredits: vi.fn(() => 0.1),
}));

import { invokeLLMWithFallback, OPENROUTER_DEFAULT_MODEL } from "./llm";

const mockOk = (model: string) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        id: "test",
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: `from ${model}` },
            finish_reason: "stop",
          },
        ],
      }),
    text: () => Promise.resolve(""),
  });

describe("OpenRouter primary routing", () => {
  let fetchSpy: any;
  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch" as any);
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("routes default Kai calls to OpenRouter with the Hermes model", async () => {
    fetchSpy.mockImplementationOnce(() => mockOk(OPENROUTER_DEFAULT_MODEL));

    await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://openrouter.ai/api/v1/chat/completions"
    );
    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers.authorization).toBe("Bearer sk-or-test-key");
    expect(headers["X-Title"]).toBe("UnifyOne");
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ model: OPENROUTER_DEFAULT_MODEL })
    );
  });

  it("collapses catalog gateway models onto the OpenRouter model", async () => {
    fetchSpy.mockImplementationOnce(() => mockOk(OPENROUTER_DEFAULT_MODEL));

    await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "claude-3-5-sonnet",
    });

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ model: OPENROUTER_DEFAULT_MODEL })
    );
  });

  it("honors explicit openrouter-prefixed model ids", async () => {
    fetchSpy.mockImplementationOnce(() => mockOk("meta-llama/llama-3.1-70b"));

    await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "openrouter/meta-llama/llama-3.1-70b",
    });

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ model: "meta-llama/llama-3.1-70b" })
    );
  });

  it("does not send Gemini thinking params to OpenRouter", async () => {
    fetchSpy.mockImplementationOnce(() => mockOk(OPENROUTER_DEFAULT_MODEL));

    await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "gemini-2.5-flash",
    });

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).not.toHaveProperty(
      "thinking"
    );
  });
});
