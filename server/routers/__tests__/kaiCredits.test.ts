import { describe, expect, it, vi } from "vitest";

vi.mock("../../_core/stripeClient", () => ({
  getStripe: vi.fn(() => null),
}));

vi.mock("../../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

import { kaiCreditsRouter } from "../kaiCredits";

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

describe("kaiCreditsRouter", () => {
  it("returns default active packages when the database is unavailable", async () => {
    const caller = kaiCreditsRouter.createCaller(ctx as any);
    const result = await caller.listPackages();
    expect(result.packages.map(pkg => pkg.slug)).toEqual([
      "starter",
      "pro",
      "scale",
    ]);
    expect(result.packages.every(pkg => pkg.isDefault)).toBe(true);
  });

  it("returns Stripe unavailable before creating a purchase", async () => {
    const caller = kaiCreditsRouter.createCaller(ctx as any);
    await expect(
      caller.createCheckout({
        packageSlug: "starter",
        origin: "https://app.example/dashboard",
      })
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("requires a tenant for checkout", async () => {
    const caller = kaiCreditsRouter.createCaller({
      ...ctx,
      user: { ...ctx.user, tenantId: null },
    } as any);
    await expect(
      caller.createCheckout({
        packageSlug: "starter",
        origin: "https://app.example",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
