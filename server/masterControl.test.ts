import { beforeEach, describe, expect, it, vi } from "vitest";
import { masterControlRouter } from "./routers/masterControl";
import { makeCtx } from "./__tests__/dbTestHelpers";
import { createTenant } from "./db";
import {
  MASTER_CONTROL_ACCOUNT_ID,
  PLATFORM_MODULES,
  TENANT_TEMPLATES,
  composeTemplateSettings,
  computeTenantHealth,
  upsertFeatureFlagSettings,
  type TenantSettings,
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
    getTenantBySlug: vi.fn().mockResolvedValue(undefined),
    createTenant: vi.fn(
      async (data: Record<string, unknown>) =>
        ({ id: 42, ...data }) as unknown as Awaited<
          ReturnType<typeof createTenant>
        >
    ),
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

  it("registers every gig-worker-starter module in PLATFORM_MODULES", () => {
    const moduleKeys = PLATFORM_MODULES.map(module => module.key);
    for (const key of TENANT_TEMPLATES["gig-worker-starter"].modules) {
      expect(moduleKeys).toContain(key);
    }
  });

  it("emits enabled feature flags for all gig-worker-starter modules", () => {
    const settings = composeTemplateSettings("gig-worker-starter");
    const flags = settings.featureFlags as Record<
      string,
      { enabled: boolean; rolloutPercent: number; source: string }
    >;

    expect(settings.provisioningTemplate).toBe("gig-worker-starter");
    for (const key of [
      "money-manager",
      "gig-worker",
      "rewards",
      "governance",
    ]) {
      expect(flags[key]).toMatchObject({
        enabled: true,
        rolloutPercent: 100,
        source: "template",
      });
    }
    // Gamification is registered as a gig module but not part of the starter
    // template, and commerce modules stay off for gig tenants.
    expect(flags["gamification"]).toMatchObject({ enabled: false });
    expect(flags["revenue-command"]).toMatchObject({ enabled: false });
    expect(flags["dealflow"]).toMatchObject({ enabled: false });
  });

  it("still resolves commerce template feature flags", () => {
    const registeredKeys = new Set(PLATFORM_MODULES.map(module => module.key));
    for (const templateKey of [
      "agency-commerce-pro",
      "white-label-scale",
    ] as const) {
      const settings = composeTemplateSettings(templateKey);
      const flags = settings.featureFlags as Record<
        string,
        { enabled: boolean }
      >;
      // Only registered modules produce flags — `team` is referenced by
      // commerce templates but not (yet) a PLATFORM_MODULES entry.
      const registeredModules = TENANT_TEMPLATES[templateKey].modules.filter(
        key => registeredKeys.has(key as never)
      );
      expect(registeredModules.length).toBeGreaterThan(0);
      for (const key of registeredModules) {
        expect(flags[key]).toMatchObject({ enabled: true });
      }
    }
    const agencyFlags = composeTemplateSettings("agency-commerce-pro")
      .featureFlags as Record<string, { enabled: boolean }>;
    expect(agencyFlags["revenue-command"]).toMatchObject({ enabled: true });
    expect(agencyFlags["money-manager"]).toMatchObject({ enabled: false });
  });

  it("categorizes gig operator tools under the gig category", () => {
    const byKey = Object.fromEntries(
      PLATFORM_MODULES.map(module => [module.key, module])
    );
    for (const key of [
      "dealflow",
      "money-manager",
      "gig-worker",
      "rewards",
      "gamification",
    ]) {
      expect(byKey[key]?.category).toBe("gig");
    }
    expect(byKey["revenue-command"]?.category).toBe("commerce");
  });

  it("declares a primaryProduct on every tenant template", () => {
    expect(TENANT_TEMPLATES["gig-worker-starter"].primaryProduct).toBe("gig");
    expect(TENANT_TEMPLATES["agency-commerce-pro"].primaryProduct).toBe(
      "commerce"
    );
    expect(TENANT_TEMPLATES["white-label-scale"].primaryProduct).toBe(
      "commerce"
    );
  });

  it("passes the template's primaryProduct through tenant provisioning", async () => {
    const ctx = makeCtx({
      user: {
        ...makeCtx().user!,
        openId: MASTER_CONTROL_ACCOUNT_ID,
      },
    });
    const caller = masterControlRouter.createCaller(ctx);

    const commerce = await caller.createTenantFromTemplate({
      template: "agency-commerce-pro",
      name: "Agency Test",
    });
    expect(commerce.success).toBe(true);
    expect(vi.mocked(createTenant)).toHaveBeenLastCalledWith(
      expect.objectContaining({ primaryProduct: "commerce" })
    );

    const gig = await caller.createTenantFromTemplate({
      template: "gig-worker-starter",
      name: "Gig Test",
    });
    expect(gig.success).toBe(true);
    expect(vi.mocked(createTenant)).toHaveBeenLastCalledWith(
      expect.objectContaining({ primaryProduct: "gig" })
    );

    const gigCall = vi.mocked(createTenant).mock.lastCall?.[0] as {
      settings?: TenantSettings;
    };
    const flags = (gigCall.settings as TenantSettings).featureFlags as Record<
      string,
      { enabled: boolean }
    >;
    for (const key of [
      "money-manager",
      "gig-worker",
      "rewards",
      "governance",
    ]) {
      expect(flags[key]).toMatchObject({ enabled: true });
    }
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
