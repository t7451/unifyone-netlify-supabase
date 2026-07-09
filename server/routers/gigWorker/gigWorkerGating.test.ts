import { describe, it, expect, vi, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { gigWorkerService } from "./gigWorker.service";

type Access = Awaited<ReturnType<typeof gigWorkerService.checkFeatureAccess>>;

describe("gigWorkerService.requireFeature", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws FORBIDDEN when the user's plan lacks the feature", async () => {
    vi.spyOn(gigWorkerService, "checkFeatureAccess").mockResolvedValue({
      hasAccess: false,
      userTier: "starter",
      requiredTier: "pro",
      upgradePlan: { name: "Gig Pro" },
    } as unknown as Access);

    await expect(
      gigWorkerService.requireFeature(1, "tax_export")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Surfaces the upgrade plan name in the message so the UI/CTA can guide.
    await expect(
      gigWorkerService.requireFeature(1, "tax_export")
    ).rejects.toThrow(/Gig Pro/);
  });

  it("returns the access record when the feature is unlocked", async () => {
    const access = {
      hasAccess: true,
      userTier: "pro",
      requiredTier: "pro",
      upgradePlan: null,
    } as unknown as Access;
    vi.spyOn(gigWorkerService, "checkFeatureAccess").mockResolvedValue(access);

    const result = await gigWorkerService.requireFeature(1, "tax_export");
    expect(result.hasAccess).toBe(true);
    expect(result).toBe(access);
  });

  it("fails closed with FORBIDDEN for an unknown feature key", async () => {
    // Guard runs before checkFeatureAccess, so no mock is needed — an unknown
    // key must never fall through to the starter default and grant access.
    const spy = vi.spyOn(gigWorkerService, "checkFeatureAccess");
    await expect(
      gigWorkerService.requireFeature(1, "not_a_real_feature" as never)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("throws a TRPCError instance (not a plain error)", async () => {
    vi.spyOn(gigWorkerService, "checkFeatureAccess").mockResolvedValue({
      hasAccess: false,
      userTier: "starter",
      requiredTier: "pro",
      upgradePlan: null,
    } as unknown as Access);

    await expect(
      gigWorkerService.requireFeature(1, "route_optimizer")
    ).rejects.toBeInstanceOf(TRPCError);
  });
});
