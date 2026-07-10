import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB BEFORE importing rule engine
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";
import { evaluateRulesForEvent } from "./ruleEngine";
import {
  financialRules,
  notifications,
  savingsEnvelopes,
  envelopeTransactions,
} from "../../drizzle/schema";

interface MockEnvelope {
  id: number;
  userId: number;
  name: string;
  category: string;
  balanceCents: number;
  targetCents: number | null;
  enabled: boolean;
}

interface MockState {
  envelope: MockEnvelope | null;
  existingTxns: any[];
  inserts: {
    notifications: any[];
    savingsEnvelopes: any[];
    envelopeTransactions: any[];
  };
  updates: Array<{ table: unknown; values: any }>;
}

// Chainable Drizzle-ish stub. Routes reads/writes by table identity so the
// rule engine AND the envelope ledger it now calls (creditEnvelope →
// moneyManager.repo) both run against controlled rows and capture their writes.
function makeMockDb(
  rules: any[],
  opts: { envelope?: MockEnvelope | null; existingTxns?: any[] } = {}
) {
  const state: MockState = {
    envelope: opts.envelope ?? null,
    existingTxns: opts.existingTxns ?? [],
    inserts: {
      notifications: [],
      savingsEnvelopes: [],
      envelopeTransactions: [],
    },
    updates: [],
  };

  const rowsForTable = (table: unknown): any[] => {
    if (table === financialRules) return rules;
    if (table === envelopeTransactions) return state.existingTxns;
    if (table === savingsEnvelopes)
      return state.envelope ? [state.envelope] : [];
    return [];
  };

  // A thenable that also chains .where/.orderBy/.limit — matches the varied
  // select shapes across loadCandidateRules and the envelope repo reads.
  const makeSelectResult = (getRows: () => any[]) => {
    const res: any = {
      where: () => res,
      orderBy: () => res,
      limit: () => res,
      then: (resolve: any, reject: any) =>
        Promise.resolve(getRows()).then(resolve, reject),
    };
    return res;
  };

  const db: any = {
    _state: state,
    select: () => ({
      from: (table: unknown) => makeSelectResult(() => rowsForTable(table)),
    }),
    insert: (table: unknown) => ({
      values: (vals: any) => {
        if (table === notifications) state.inserts.notifications.push(vals);
        else if (table === savingsEnvelopes) {
          state.inserts.savingsEnvelopes.push(vals);
          // Simulate find-or-create: the new envelope becomes readable.
          state.envelope = {
            id: 1,
            userId: vals.userId,
            name: vals.name,
            category: vals.category,
            balanceCents: 0,
            targetCents: vals.targetCents ?? null,
            enabled: true,
          };
        } else if (table === envelopeTransactions) {
          state.inserts.envelopeTransactions.push(vals);
          // Recorded txn is now visible to idempotency lookups.
          state.existingTxns.push(vals);
        }
        const result: any = {
          returning: () => Promise.resolve([{ id: 1 }]),
          then: (resolve: any, reject: any) =>
            Promise.resolve([{ id: 1 }]).then(resolve, reject),
        };
        return result;
      },
    }),
    update: (table: unknown) => ({
      set: (vals: any) => ({
        where: () => {
          state.updates.push({ table, values: vals });
          return Promise.resolve(undefined);
        },
      }),
    }),
  };

  return db;
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

  it("credits the set-aside envelope when a save rule fires", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "Save 10%",
      description: null,
      type: "allocation",
      triggerType: "income_received",
      triggerValue: "0.00",
      actionType: "save",
      actionValue: null,
      actionPercent: "10.00",
      category: null,
      platform: null,
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    // Existing "savings" envelope with a $50.00 running balance.
    const db = makeMockDb([rule], {
      envelope: {
        id: 1,
        userId: 7,
        name: "Savings",
        category: "savings",
        balanceCents: 5000,
        targetCents: null,
        enabled: true,
      },
    });
    (getDb as any).mockResolvedValue(db);

    const out = await evaluateRulesForEvent({
      userId: 7,
      event: {
        type: "income_received",
        amountCents: 20000,
        referenceId: "42",
      },
    });

    // 10% of $200.00 = $20.00 credited on top of the $50.00 balance.
    expect(out.fired).toHaveLength(1);
    expect(out.fired[0].actionAmountCents).toBe(2000);

    const txns = db._state.inserts.envelopeTransactions;
    expect(txns).toHaveLength(1);
    expect(txns[0].amountCents).toBe(2000);
    expect(txns[0].balanceAfter).toBe(7000);
    expect(txns[0].ruleId).toBe(1);
    expect(txns[0].idempotencyKey).toBe("envelope-credit:1:42");
    // The envelope balance was bumped (atomic increment update captured).
    expect(db._state.updates.length).toBeGreaterThanOrEqual(1);
  });

  it("credits only once when the same (rule, shift) fires twice", async () => {
    const rule = {
      id: 1,
      userId: 7,
      name: "Save 10%",
      description: null,
      type: "allocation",
      triggerType: "income_received",
      triggerValue: "0.00",
      actionType: "save",
      actionValue: null,
      actionPercent: "10.00",
      category: null,
      platform: null,
      enabled: true,
      triggerCount: 0,
      lastTriggeredAt: null,
    };
    const db = makeMockDb([rule], {
      envelope: {
        id: 1,
        userId: 7,
        name: "Savings",
        category: "savings",
        balanceCents: 0,
        targetCents: null,
        enabled: true,
      },
    });
    (getDb as any).mockResolvedValue(db);

    const event = {
      type: "income_received" as const,
      amountCents: 20000,
      referenceId: "42",
    };

    await evaluateRulesForEvent({ userId: 7, event });
    await evaluateRulesForEvent({ userId: 7, event });

    // Same idempotencyKey (envelope-credit:1:42) on the second run → no
    // double-credit.
    expect(db._state.inserts.envelopeTransactions).toHaveLength(1);
    expect(db._state.inserts.envelopeTransactions[0].balanceAfter).toBe(2000);
  });
});
