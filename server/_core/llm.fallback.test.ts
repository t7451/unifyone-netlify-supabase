import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./env", () => ({
  ENV: { forgeApiKey: "test-key", groqApiKey: "groq-test-key" },
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

import {
  invokeLLMWithFallback,
  DEFAULT_FALLBACK_CHAIN,
  GROQ_FALLBACK_MODEL,
} from "./llm";
import { meterCredits } from "../creditMeter";

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

const mockErr = (status: number, statusText = "fail") =>
  Promise.resolve({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(`error ${status}`),
    json: () => Promise.resolve({}),
  });

describe("invokeLLMWithFallback", () => {
  let fetchSpy: any;
  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch" as any);
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns first model success without fallback", async () => {
    fetchSpy.mockImplementationOnce(() => mockOk("gemini-2.5-flash"));
    const out = await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out.choices[0].message.content).toBe("from gemini-2.5-flash");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to next model on 5xx error", async () => {
    fetchSpy
      .mockImplementationOnce(() => mockErr(503, "service unavailable"))
      .mockImplementationOnce(() => mockOk("claude-3-5-haiku"));
    const out = await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out.choices[0].message.content).toBe("from claude-3-5-haiku");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("falls back to Groq using the Groq API key and endpoint", async () => {
    fetchSpy
      .mockImplementationOnce(() => mockErr(503, "service unavailable"))
      .mockImplementationOnce(() => mockOk(GROQ_FALLBACK_MODEL));

    const out = await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "gemini-2.5-flash",
      modelChain: [GROQ_FALLBACK_MODEL],
    });

    expect(out.choices[0].message.content).toBe(
      `from ${GROQ_FALLBACK_MODEL}`
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toBe(
      "https://api.groq.com/openai/v1/chat/completions"
    );
    expect(fetchSpy.mock.calls[1][1].headers.authorization).toBe(
      "Bearer groq-test-key"
    );
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body)).toEqual(
      expect.objectContaining({ model: GROQ_FALLBACK_MODEL })
    );
  });

  it("does NOT fall back on 401/403 auth errors", async () => {
    fetchSpy.mockImplementationOnce(() => mockErr(401, "unauthorized"));
    await expect(
      invokeLLMWithFallback({ messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("respects custom model + chain", async () => {
    fetchSpy
      .mockImplementationOnce(() => mockErr(500))
      .mockImplementationOnce(() => mockOk("custom-fallback"));
    const out = await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "custom-primary",
      modelChain: ["custom-fallback"],
    });
    expect(out.choices[0].message.content).toBe("from custom-fallback");
  });

  it("does not send provider-incompatible thinking params to non-Gemini models", async () => {
    fetchSpy.mockImplementationOnce(() => mockOk("gpt-4o-mini"));

    await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "gpt-4o-mini",
    });

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).not.toHaveProperty(
      "thinking"
    );
  });

  it("applies minimum credits and returns awaited metering metadata", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "test",
            model: "gpt-4o-mini",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "ok" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          }),
        text: () => Promise.resolve(""),
      })
    );

    const out = await invokeLLMWithFallback({
      messages: [{ role: "user", content: "hi" }],
      model: "gpt-4o-mini",
      meter: {
        userId: 1,
        action: "kai.chat:test",
        minimumCredits: 2,
        creditMultiplier: 3,
        awaitResult: true,
      },
    });

    expect(out.metering?.estimatedCredits).toBe(2);
    expect(out.metering?.chargedCredits).toBe(2);
    expect(meterCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2,
        model: "gpt-4o-mini",
        metadata: expect.objectContaining({
          credit_multiplier: 3,
          minimum_credits: 2,
        }),
      })
    );
  });

  it("exports DEFAULT_FALLBACK_CHAIN", () => {
    expect(DEFAULT_FALLBACK_CHAIN).toContain("gemini-2.5-flash");
    expect(DEFAULT_FALLBACK_CHAIN).toContain(GROQ_FALLBACK_MODEL);
  });
});
