import { describe, expect, it } from "vitest";
import {
  buildKaiChatMeterMetadata,
  DEFAULT_KAI_MODEL_ID,
  getKaiModelCatalogForClient,
  isKaiModelId,
  KAI_MODEL_CATALOG,
  KAI_MODEL_IDS,
  resolveKaiModel,
} from "./kaiModels";

describe("Kai model allowlist", () => {
  it("rejects arbitrary model strings", () => {
    expect(isKaiModelId("gemini-2.5-flash")).toBe(true);
    expect(isKaiModelId("claude-3-opus-latest")).toBe(false);
    expect(isKaiModelId("../../secrets")).toBe(false);
    expect(isKaiModelId("gpt-5.9-internal")).toBe(false);
  });

  it("exposes a safe client catalog without gateway internals", () => {
    const catalog = getKaiModelCatalogForClient();
    expect(catalog).toHaveLength(KAI_MODEL_IDS.length);
    expect(catalog[0]).toEqual(
      expect.objectContaining({
        id: DEFAULT_KAI_MODEL_ID,
        label: expect.any(String),
        provider: expect.any(String),
        creditMultiplier: expect.any(Number),
        minimumCredits: expect.any(Number),
      })
    );
    expect(catalog[0]).not.toHaveProperty("gatewayModel");
    expect(catalog[0]).not.toHaveProperty("fallbackModels");
  });

  it("resolves defaults and builds Kai metering metadata", () => {
    const selected = resolveKaiModel();
    expect(selected).toBe(KAI_MODEL_CATALOG[DEFAULT_KAI_MODEL_ID]);
    expect(buildKaiChatMeterMetadata(selected, "kai-fast")).toEqual({
      kai_model_id: DEFAULT_KAI_MODEL_ID,
      kai_model_label: selected.label,
      requested_model: "kai-fast",
    });
    expect(buildKaiChatMeterMetadata(selected)).toMatchObject({
      requested_model: null,
    });
  });
});
