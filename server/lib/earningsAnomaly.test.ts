import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({ getDb: vi.fn() }));

import { getDb } from "../db";
import { detectAnomalies } from "./earningsAnomaly";

function makeShift(platform: string, perHour: number, daysAgo: number) {
  return {
    platform,
    grossEarnings: String(perHour),
    tips: "0",
    bonuses: "0",
    durationMinutes: 60,
    startTime: new Date(Date.now() - daysAgo * 86400000),
  };
}

function makeMockDb(shifts: any[]) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue(shifts),
        })),
      })),
    })),
  };
}

describe("detectAnomalies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty when not enough shifts", async () => {
    (getDb as any).mockResolvedValue(
      makeMockDb([makeShift("DoorDash", 20, 1)])
    );
    const out = await detectAnomalies({ userId: 1 });
    expect(out).toHaveLength(0);
  });

  it("flags critical drop in $/hr", async () => {
    const baseline = Array.from({ length: 8 }, (_, i) =>
      makeShift("DoorDash", 25 + (i % 2), 10 + i)
    );
    const recent = Array.from({ length: 3 }, (_, i) =>
      makeShift("DoorDash", 10, i)
    );
    (getDb as any).mockResolvedValue(makeMockDb([...recent, ...baseline]));

    const out = await detectAnomalies({ userId: 1 });
    expect(out.length).toBeGreaterThan(0);
    const dd = out.find(r => r.platform === "DoorDash");
    expect(dd).toBeDefined();
    expect(dd!.direction).toBe("down");
    expect(dd!.severity).toMatch(/warn|critical/);
    expect(dd!.recentPerHour).toBeLessThan(dd!.baselinePerHour);
  });

  it("flags positive jump in $/hr", async () => {
    const baseline = Array.from({ length: 8 }, (_, i) =>
      makeShift("Uber", 15 + (i % 2), 10 + i)
    );
    const recent = Array.from({ length: 3 }, (_, i) =>
      makeShift("Uber", 40, i)
    );
    (getDb as any).mockResolvedValue(makeMockDb([...recent, ...baseline]));

    const out = await detectAnomalies({ userId: 1 });
    const uber = out.find(r => r.platform === "Uber");
    expect(uber).toBeDefined();
    expect(uber!.direction).toBe("up");
    expect(uber!.recentPerHour).toBeGreaterThan(uber!.baselinePerHour);
  });

  it("ignores platforms with no anomaly", async () => {
    const stable = Array.from({ length: 11 }, (_, i) =>
      makeShift("Instacart", 20, i)
    );
    (getDb as any).mockResolvedValue(makeMockDb(stable));
    const out = await detectAnomalies({ userId: 1 });
    expect(out.find(r => r.platform === "Instacart")).toBeUndefined();
  });
});
