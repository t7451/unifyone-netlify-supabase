import { describe, it, expect } from "vitest";

// ── Helpers extracted from gigWorker router ───────────────────────────────────

function currentBillingPeriod(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const TIER_ORDER = ["starter", "pro", "elite"] as const;
type Tier = (typeof TIER_ORDER)[number];

const FEATURE_TIERS: Record<string, Tier> = {
  shift_tracker: "starter",
  mileage_log: "starter",
  basic_ai: "starter",
  route_optimizer: "pro",
  tax_export: "pro",
  unlimited_rules: "pro",
  advanced_analytics: "pro",
  earnings_forecast: "elite",
  ai_strategy: "elite",
  priority_support: "elite",
};

function hasFeatureAccess(userTier: Tier, feature: string): boolean {
  const required = FEATURE_TIERS[feature] ?? "starter";
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}

function creditsRemaining(used: number, quota: number): number {
  return Math.max(0, quota - used);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("GigWorker router — billing period helper", () => {
  it("formats billing period as YYYY-MM", () => {
    const period = currentBillingPeriod(new Date("2025-04-15T10:00:00Z"));
    expect(period).toBe("2025-04");
  });

  it("handles year boundary (January)", () => {
    const period = currentBillingPeriod(new Date("2026-01-01T00:00:00Z"));
    expect(period).toBe("2026-01");
  });

  it("pads single-digit months with a leading zero", () => {
    const period = currentBillingPeriod(new Date("2025-09-30T23:59:59Z"));
    expect(period).toBe("2025-09");
  });
});

describe("GigWorker router — feature access gates", () => {
  it("starter tier can access shift_tracker and mileage_log", () => {
    expect(hasFeatureAccess("starter", "shift_tracker")).toBe(true);
    expect(hasFeatureAccess("starter", "mileage_log")).toBe(true);
    expect(hasFeatureAccess("starter", "basic_ai")).toBe(true);
  });

  it("starter tier cannot access pro features", () => {
    expect(hasFeatureAccess("starter", "route_optimizer")).toBe(false);
    expect(hasFeatureAccess("starter", "tax_export")).toBe(false);
    expect(hasFeatureAccess("starter", "unlimited_rules")).toBe(false);
    expect(hasFeatureAccess("starter", "advanced_analytics")).toBe(false);
  });

  it("starter tier cannot access elite features", () => {
    expect(hasFeatureAccess("starter", "earnings_forecast")).toBe(false);
    expect(hasFeatureAccess("starter", "ai_strategy")).toBe(false);
    expect(hasFeatureAccess("starter", "priority_support")).toBe(false);
  });

  it("pro tier can access all starter and pro features", () => {
    expect(hasFeatureAccess("pro", "shift_tracker")).toBe(true);
    expect(hasFeatureAccess("pro", "route_optimizer")).toBe(true);
    expect(hasFeatureAccess("pro", "tax_export")).toBe(true);
    expect(hasFeatureAccess("pro", "advanced_analytics")).toBe(true);
  });

  it("pro tier cannot access elite features", () => {
    expect(hasFeatureAccess("pro", "earnings_forecast")).toBe(false);
    expect(hasFeatureAccess("pro", "ai_strategy")).toBe(false);
  });

  it("elite tier can access all features", () => {
    for (const feature of Object.keys(FEATURE_TIERS)) {
      expect(hasFeatureAccess("elite", feature)).toBe(true);
    }
  });

  it("unknown feature defaults to starter-accessible (open by default)", () => {
    // Unknown features fall back to "starter" requirement
    expect(hasFeatureAccess("starter", "nonexistent_feature")).toBe(true);
    expect(hasFeatureAccess("pro", "nonexistent_feature")).toBe(true);
    expect(hasFeatureAccess("elite", "nonexistent_feature")).toBe(true);
  });
});

describe("GigWorker router — AI credit logic", () => {
  it("credits remaining is never negative", () => {
    expect(creditsRemaining(300, 250)).toBe(0);
    expect(creditsRemaining(250, 250)).toBe(0);
  });

  it("calculates remaining credits correctly", () => {
    expect(creditsRemaining(10, 25)).toBe(15);
    expect(creditsRemaining(0, 1000)).toBe(1000);
    expect(creditsRemaining(999, 1000)).toBe(1);
  });
});

describe("GigWorker plans — pricing config", () => {
  const PLANS = [
    { slug: "gig-starter", priceMonthly: 0, monthlyAICredits: 25 },
    { slug: "gig-pro", priceMonthly: 9.99, monthlyAICredits: 250 },
    { slug: "gig-elite", priceMonthly: 24.99, monthlyAICredits: 1000 },
  ];

  it("starter plan is free", () => {
    const starter = PLANS.find(p => p.slug === "gig-starter")!;
    expect(starter.priceMonthly).toBe(0);
  });

  it("plans are ordered by price ascending", () => {
    const prices = PLANS.map(p => p.priceMonthly);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("elite plan has the highest AI credit quota", () => {
    const quotas = PLANS.map(p => p.monthlyAICredits);
    const maxQuota = Math.max(...quotas);
    expect(PLANS.find(p => p.slug === "gig-elite")!.monthlyAICredits).toBe(maxQuota);
  });

  it("each plan has unique credits quota", () => {
    const quotas = PLANS.map(p => p.monthlyAICredits);
    expect(new Set(quotas).size).toBe(quotas.length);
  });
});
