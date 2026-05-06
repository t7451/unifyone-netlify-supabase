import { beforeEach, describe, expect, it, vi } from "vitest";
import { masterControlRouter } from "./routers/masterControl";
import { makeCtx } from "./__tests__/dbTestHelpers";
import {
  MASTER_CONTROL_ACCOUNT_ID,
  composeTemplateSettings,
  computeTenantHealth,
  upsertFeatureFlagSettings,
} from "./lib/masterControl";

const dbState = {
  selectResult: [] as Array<{ id: number }>,
  updateWhere: vi.fn(() => Promise.resolve()),
};

vi.mock("./db", () => {
  const makeChain = () => {
    const chain = {
      from: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(dbState.selectResult),
      set: () => ({ where: dbState.updateWhere }),
    };
    return chain;
  };

  return {
    getDb: vi.fn().mockResolvedValue({
      select: () => makeChain(),
      update: () => makeChain(),
    }),
    getAllTenants: vi.fn().mockResolvedValue([]),
    getPlans: vi.fn().mockResolvedValue([]),
    getTenantById: vi.fn().mockResolvedValue(undefined),
  };
});

describe("masterControl router", () => {
  beforeEach(() => {
    dbState.selectResult = [];
    dbState.updateWhere.mockClear();
  });

  it("does not unlock Master Control for a different account id", async () => {
    const caller = masterControlRouter.createCaller(
      makeCtx({
        user: {
          ...makeCtx().user!,
          openId: "not-the-owner",
          role: "admin",
        },
      })
    );

    const status = await caller.status();

    expect(status.canUseMasterControl).toBe(false);
    await expect(caller.claimOwnerAccess()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows the configured owner account to claim admin and username", async () => {
    const ctx = makeCtx({
      user: {
        ...makeCtx().user!,
        openId: MASTER_CONTROL_ACCOUNT_ID,
        username: null,
        role: "user",
      },
    });
    const caller = masterControlRouter.createCaller(ctx);

    const status = await caller.status();
    const result = await caller.claimOwnerAccess();

    expect(status.canUseMasterControl).toBe(true);
    expect(status.needsAdminClaim).toBe(true);
    expect(result).toEqual({
      success: true,
      role: "admin",
      username: "master_control",
      usernameClaimed: true,
    });
    expect(dbState.updateWhere).toHaveBeenCalledTimes(1);
  });

  it("builds provisioning template settings with AI governance and flags", () => {
    const settings = composeTemplateSettings("agency-commerce-pro");

    expect(settings.provisioningTemplate).toBe("agency-commerce-pro");
    expect(settings.aiGovernance).toMatchObject({
      creditPool: { monthlyLimit: 5000, burstLimit: 500 },
    });
    expect(settings.featureFlags).toMatchObject({
      automations: { enabled: true, source: "template" },
      mcp: { enabled: false, source: "template" },
    });
  });

  it("merges tenant feature flag overrides without dropping settings", () => {
    const settings = upsertFeatureFlagSettings(
      { existing: true },
      [
        {
          key: "governance",
          enabled: false,
          rolloutPercent: 10,
          flagType: "hard",
        },
      ],
      "tenant"
    );

    expect(settings.existing).toBe(true);
    expect(settings.featureFlags).toMatchObject({
      governance: {
        enabled: false,
        rolloutPercent: 10,
        flagType: "hard",
        source: "tenant",
      },
    });
  });

  it("scores tenant health from lifecycle, billing, and usage signals", () => {
    const health = computeTenantHealth({
      tenant: {
        status: "suspended",
        subscriptionStatus: "past_due",
        shopifySyncEnabled: true,
      },
      recentWebhookFailures: 3,
      kaiCreditsUsed: 12_000,
      activeUsers: 0,
    });

    expect(health.color).toBe("red");
    expect(health.score).toBeLessThan(55);
    expect(health.reasons).toContain("tenant_suspended");
    expect(health.reasons).toContain("billing_past_due");
  });
});
