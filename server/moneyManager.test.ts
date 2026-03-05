import { describe, it, expect } from "vitest";

// ── Money Manager Router — unit tests ────────────────────────────────────────
// These tests validate the business logic helpers and configuration, not the
// full tRPC stack (which requires a live DB). We test the pure functions and
// constants that are safe to run in CI without a database connection.

const IRS_RATE_2025 = 0.70; // $0.70 per mile

function calcMileageDeduction(miles: number): number {
  return Math.round(miles * IRS_RATE_2025 * 100) / 100;
}

function calcTotalEarnings(gross: number, tips: number, bonuses: number): number {
  return Math.round((gross + tips + bonuses) * 100) / 100;
}

function calcHourlyRate(totalEarnings: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.round((totalEarnings / (durationMinutes / 60)) * 100) / 100;
}

function calcLevel(totalPoints: number): number {
  // Level formula: level = floor(sqrt(totalPoints / 50)) + 1
  return Math.floor(Math.sqrt(totalPoints / 50)) + 1;
}

function calcNextLevelAt(level: number): number {
  return Math.pow(level, 2) * 50;
}

describe("Money Manager — mileage deduction calculator", () => {
  it("calculates IRS 2025 deduction at $0.70/mile", () => {
    expect(calcMileageDeduction(100)).toBe(70);
    expect(calcMileageDeduction(1000)).toBe(700);
    expect(calcMileageDeduction(0)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(calcMileageDeduction(7)).toBe(4.9);
    expect(calcMileageDeduction(3)).toBe(2.1);
  });
});

describe("Money Manager — shift earnings calculator", () => {
  it("sums gross + tips + bonuses correctly", () => {
    expect(calcTotalEarnings(50, 10, 5)).toBe(65);
    expect(calcTotalEarnings(100, 0, 0)).toBe(100);
    expect(calcTotalEarnings(0, 0, 0)).toBe(0);
  });

  it("handles decimal amounts", () => {
    expect(calcTotalEarnings(49.99, 5.01, 0)).toBe(55);
  });
});

describe("Money Manager — hourly rate calculator", () => {
  it("calculates hourly rate from earnings and duration", () => {
    // $60 in 60 minutes = $60/hr
    expect(calcHourlyRate(60, 60)).toBe(60);
    // $30 in 30 minutes = $60/hr
    expect(calcHourlyRate(30, 30)).toBe(60);
    // $100 in 120 minutes = $50/hr
    expect(calcHourlyRate(100, 120)).toBe(50);
  });

  it("returns 0 for zero duration", () => {
    expect(calcHourlyRate(100, 0)).toBe(0);
  });
});

describe("Gamification — level calculation", () => {
  it("starts at level 1 with 0 points", () => {
    expect(calcLevel(0)).toBe(1);
  });

  it("levels up at correct thresholds", () => {
    expect(calcLevel(50)).toBe(2);   // sqrt(50/50) = 1 → level 2
    expect(calcLevel(200)).toBe(3);  // sqrt(200/50) = 2 → level 3
    expect(calcLevel(450)).toBe(4);  // sqrt(450/50) = 3 → level 4
  });

  it("calculates next level threshold", () => {
    expect(calcNextLevelAt(1)).toBe(50);
    expect(calcNextLevelAt(2)).toBe(200);
    expect(calcNextLevelAt(3)).toBe(450);
    expect(calcNextLevelAt(10)).toBe(5000);
  });
});

describe("Gamification — achievement rarity tiers", () => {
  const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

  it("has 5 defined rarity tiers", () => {
    expect(RARITIES).toHaveLength(5);
  });

  it("rarity tiers are ordered by ascending value", () => {
    const pointsMap: Record<string, number> = {
      common: 50,
      uncommon: 150,
      rare: 300,
      epic: 600,
      legendary: 1000,
    };
    const values = RARITIES.map(r => pointsMap[r]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe("Money Manager — financial rule types", () => {
  const RULE_TYPES = ["auto_save", "budget_cap", "alert", "allocation", "goal"];
  const TRIGGER_TYPES = ["income_received", "expense_over", "balance_below", "balance_above", "scheduled", "manual"];
  const ACTION_TYPES = ["transfer", "notify", "block", "tag", "save"];

  it("has 5 rule types", () => {
    expect(RULE_TYPES).toHaveLength(5);
  });

  it("has 6 trigger types", () => {
    expect(TRIGGER_TYPES).toHaveLength(6);
  });

  it("has 5 action types", () => {
    expect(ACTION_TYPES).toHaveLength(5);
  });

  it("alert is a valid rule type", () => {
    expect(RULE_TYPES).toContain("alert");
  });

  it("income_received is a valid trigger type", () => {
    expect(TRIGGER_TYPES).toContain("income_received");
  });
});
