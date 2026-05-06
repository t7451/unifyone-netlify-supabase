import { describe, expect, it } from "vitest";
import { aiRouter } from "../ai";

const ctx = {
  user: {
    id: 7,
    email: "buyer@example.com",
    tenantId: 44,
    role: "user",
    openId: "openid",
  },
  req: {} as any,
  res: {} as any,
};

describe("aiRouter Kai model allowlist", () => {
  it("lists only safe client model metadata", async () => {
    const caller = aiRouter.createCaller(ctx as any);
    const result = await caller.listModels();
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models[0]).toHaveProperty("id");
    expect(result.models[0]).not.toHaveProperty("gatewayModel");
    expect(result.models[0]).not.toHaveProperty("fallbackModels");
  });

  it("rejects arbitrary model strings before LLM work", async () => {
    const caller = aiRouter.createCaller(ctx as any);
    await expect(
      caller.chat({
        message: "hello",
        context: "general",
        model: "unreviewed-provider-model" as any,
      })
    ).rejects.toThrow(/Invalid option/);
  });
});
