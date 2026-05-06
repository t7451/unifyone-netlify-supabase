import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB BEFORE importing rule engine
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";
import { evaluateRulesForEvent } from "./ruleEngine";

function makeMockDb(rules: any[]) {
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(rules),
      })),
    })),
    update: vi.fn(() => updateChain),
    insert: vi.fn(() => insertChain),
  };
}

describe("ruleEngine.evaluateRulesForEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires income_received notify rule when amount >= triggerValue", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "Big payday alert",
      description: "Income >= $200",
      type: "alert",
      triggerType: "income_received",
      triggerValue: "200.00",
      actionType: "notify",
      actionValue: null,
      actionPercent: null,
      category: null,
      platform: null,
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    (getDb as any).mockResolvedValue(makeMockDb([rule]));

    const out = await evaluateRulesForEvent({
      userId: 7,
      event: { type: "income_received", amountCents: 25000 },
    });

    expect(out.fired).toHaveLength(1);
    expect(out.fired[0].actionType).toBe("notify");
    expect(out.blocked).toBe(false);
  });

  it("does NOT fire when amount below trigger threshold", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "x",
      description: null,
      type: "alert",
      triggerType: "income_received",
      triggerValue: "200.00",
      actionType: "notify",
      actionValue: null,
      actionPercent: null,
      category: null,
      platform: null,
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    (getDb as any).mockResolvedValue(makeMockDb([rule]));

    const out = await evaluateRulesForEvent({
      userId: 7,
      event: { type: "income_received", amountCents: 5000 },
    });
    expect(out.fired).toHaveLength(0);
  });

  it("respects platform targeting", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "DD only",
      description: null,
      type: "auto_save",
      triggerType: "income_received",
      triggerValue: "0.00",
      actionType: "save",
      actionValue: null,
      actionPercent: "10.00",
      category: null,
      platform: "DoorDash",
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    (getDb as any).mockResolvedValue(makeMockDb([rule]));

    const matched = await evaluateRulesForEvent({
      userId: 7,
      event: {
        type: "income_received",
        amountCents: 10000,
        platform: "DoorDash",
      },
    });
    expect(matched.fired).toHaveLength(1);
    expect(matched.fired[0].actionAmountCents).toBe(1000); // 10% of 10000

    const unmatched = await evaluateRulesForEvent({
      userId: 7,
      event: { type: "income_received", amountCents: 10000, platform: "Uber" },
    });
    expect(unmatched.fired).toHaveLength(0);
  });

  it("block action sets blocked=true", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "Cap",
      description: null,
      type: "budget_cap",
      triggerType: "expense_over",
      triggerValue: "500.00",
      actionType: "block",
      actionValue: null,
      actionPercent: null,
      category: null,
      platform: null,
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    (getDb as any).mockResolvedValue(makeMockDb([rule]));

    const out = await evaluateRulesForEvent({
      userId: 7,
      event: { type: "expense_over", amountCents: 60000 },
    });
    expect(out.blocked).toBe(true);
    expect(out.fired[0].actionType).toBe("block");
  });

  it("balance_below trigger fires when balance <= triggerValue", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "Low balance alert",
      description: null,
      type: "alert",
      triggerType: "balance_below",
      triggerValue: "100.00",
      actionType: "notify",
      actionValue: null,
      actionPercent: null,
      category: null,
      platform: null,
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    (getDb as any).mockResolvedValue(makeMockDb([rule]));

    const out = await evaluateRulesForEvent({
      userId: 7,
      event: { type: "balance_below", balanceCents: 5000 },
    });
    expect(out.fired).toHaveLength(1);
  });

  it("returns empty when no rules match trigger type", async () => {
    (getDb as any).mockResolvedValue(makeMockDb([]));
    const out = await evaluateRulesForEvent({
      userId: 7,
      event: { type: "income_received", amountCents: 10000 },
    });
    expect(out.fired).toHaveLength(0);
    expect(out.blocked).toBe(false);
  });
});
