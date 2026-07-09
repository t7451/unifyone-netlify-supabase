/**
 * Operator gating — remaining gig-domain routers
 *
 * Regression tests for the gig-position changeover: the gamification,
 * socialFriends, rewards, revenueStreams, and mobileAutomation routers are
 * gig-domain features and must use `operatorProcedure` (see
 * server/_core/trpc.ts). That middleware FORBIDs commerce-primary tenants,
 * treats users without a tenant as operators, and fails open to "gig" on
 * lookup error.
 *
 * Strategy (mirrors mcpRouterTenantIsolation.test.ts):
 *  - Pin `getTenantPrimaryProduct` via vi.mock so the tests stay DB-free and
 *    deterministic; flip its return value per test.
 *  - Mock each router's service module so a passing gate resolves without
 *    touching a database.
 *  - Assert a commerce-primary tenant gets FORBIDDEN (and the service is
 *    never invoked), and a gig-primary tenant passes through to the service.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GIG_OPERATOR_FEATURES_DISABLED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "../_core/context";

const { getTenantPrimaryProductMock } = vi.hoisted(() => ({
  getTenantPrimaryProductMock: vi.fn(async () => "gig" as "gig" | "commerce"),
}));

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
  getTenantPrimaryProduct: getTenantPrimaryProductMock,
}));

// mobileAutomation's trackDeepLink touches the public form rate limiter at
// module load; stub it so no timers/state leak into the tests.
vi.mock("../_core/rateLimiter", () => ({
  mcpRateLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
  llmRateLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
  publicFormLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
}));

// Service layers — one sentinel per router so we can assert the gate let the
// call through (gig) or short-circuited before the service ran (commerce).
const { serviceMocks } = vi.hoisted(() => ({
  serviceMocks: {
    gamification: vi.fn(async () => "gamification-ok"),
    socialFriends: vi.fn(async () => "socialFriends-ok"),
    rewards: vi.fn(async () => "rewards-ok"),
    revenueStreams: vi.fn(async () => "revenueStreams-ok"),
    mobileAutomation: vi.fn(async () => "mobileAutomation-ok"),
  },
}));

vi.mock("../routers/gamification/gamification.service", () => ({
  getPointsSummary: serviceMocks.gamification,
}));
vi.mock("../routers/socialFriends/socialFriends.service", () => ({
  listFriends: serviceMocks.socialFriends,
}));
vi.mock("../routers/rewards/rewards.service", () => ({
  getBalance: serviceMocks.rewards,
}));
vi.mock("../routers/revenueStreams/revenueStreams.service", () => ({
  listStreams: serviceMocks.revenueStreams,
}));
vi.mock("../routers/mobileAutomation/mobileAutomation.service", () => ({
  getCapiSummary: serviceMocks.mobileAutomation,
}));

import { gamificationRouter } from "../routers/gamification";
import { socialFriendsRouter } from "../routers/socialFriends";
import { rewardsRouter } from "../routers/rewards";
import { revenueStreamsRouter } from "../routers/revenueStreams";
import { mobileAutomationRouter } from "../routers/mobileAutomation";

type UserLike = {
  id: number;
  tenantId: number | null;
  role: string;
  email: string;
  openId: string;
  name: string | null;
  creditBalance: number;
  emailVerified: boolean | null;
};

function makeUser(overrides: Partial<UserLike> = {}): UserLike {
  return {
    id: 1,
    tenantId: 100,
    role: "user",
    email: "alice@example.com",
    openId: "open-1",
    name: "Alice",
    creditBalance: 0,
    emailVerified: true,
    ...overrides,
  };
}

function makeCtx(user: UserLike | null = null): TrpcContext {
  return {
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: user as TrpcContext["user"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getTenantPrimaryProductMock.mockResolvedValue("gig");
});

// One representative read procedure per router. The gate is a shared
// middleware, so covering one procedure per router covers the tier change.
const cases = [
  {
    name: "gamification.getPointsSummary",
    call: (ctx: TrpcContext) =>
      gamificationRouter.createCaller(ctx).getPointsSummary(),
    service: () => serviceMocks.gamification,
    sentinel: "gamification-ok",
  },
  {
    name: "socialFriends.listFriends",
    call: (ctx: TrpcContext) =>
      socialFriendsRouter.createCaller(ctx).listFriends(),
    service: () => serviceMocks.socialFriends,
    sentinel: "socialFriends-ok",
  },
  {
    name: "rewards.getBalance",
    call: (ctx: TrpcContext) => rewardsRouter.createCaller(ctx).getBalance(),
    service: () => serviceMocks.rewards,
    sentinel: "rewards-ok",
  },
  {
    name: "revenueStreams.list",
    call: (ctx: TrpcContext) => revenueStreamsRouter.createCaller(ctx).list(),
    service: () => serviceMocks.revenueStreams,
    sentinel: "revenueStreams-ok",
  },
  {
    name: "mobileAutomation.getCapiSummary",
    call: (ctx: TrpcContext) =>
      mobileAutomationRouter.createCaller(ctx).getCapiSummary(),
    service: () => serviceMocks.mobileAutomation,
    sentinel: "mobileAutomation-ok",
  },
] as const;

describe.each(cases)("operator gate — $name", ({ call, service, sentinel }) => {
  it("rejects a commerce-primary tenant with FORBIDDEN", async () => {
    getTenantPrimaryProductMock.mockResolvedValue("commerce");
    await expect(call(makeCtx(makeUser()))).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: GIG_OPERATOR_FEATURES_DISABLED_ERR_MSG,
    });
    expect(getTenantPrimaryProductMock).toHaveBeenCalledWith(100);
    expect(service()).not.toHaveBeenCalled();
  });

  it("passes for a gig-primary tenant", async () => {
    getTenantPrimaryProductMock.mockResolvedValue("gig");
    await expect(call(makeCtx(makeUser()))).resolves.toBe(sentinel);
    expect(service()).toHaveBeenCalledTimes(1);
  });

  it("treats a user with no tenant as an operator (no lookup)", async () => {
    await expect(call(makeCtx(makeUser({ tenantId: null })))).resolves.toBe(
      sentinel
    );
    expect(getTenantPrimaryProductMock).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(call(makeCtx(null))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(service()).not.toHaveBeenCalled();
  });
});
