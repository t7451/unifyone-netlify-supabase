import { beforeEach, describe, expect, it, vi } from "vitest";
import { masterControlRouter } from "./routers/masterControl";
import { makeCtx } from "./__tests__/dbTestHelpers";
import { MASTER_CONTROL_ACCOUNT_ID } from "./lib/masterControl";

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
});
