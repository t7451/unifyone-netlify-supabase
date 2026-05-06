import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./env", () => ({
  ENV: { forgeApiKey: "test-key" },
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

import { invokeLLMWithFallback, DEFAULT_FALLBACK_CHAIN } from "./llm";

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

  it("exports DEFAULT_FALLBACK_CHAIN", () => {
    expect(DEFAULT_FALLBACK_CHAIN).toContain("gemini-2.5-flash");
  });
});
