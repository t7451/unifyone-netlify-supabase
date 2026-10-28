import { describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import {
  startOrResumeShift,
  completeShiftWithMileage,
} from "./moneyManager.repo";

function fixture() {
  const query = vi.fn((statement: string, params: unknown[]) => ({
    statement,
    params,
  }));
  const transaction = vi.fn(async () => [
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [[7, "2026-10-28 12:00:00", "Existing app"]] },
  ]);
  const client = Object.assign(query, { query, transaction });
  return {
    db: drizzle(client as unknown as NeonQueryFunction<false, false>),
    query,
    transaction,
  };
}

describe("Neon timer SQL transaction and atomicity contract", () => {
  it("sets READ COMMITTED, locks the owner, conditionally starts, then reads the authoritative row in one transaction", async () => {
    const { db, query, transaction } = fixture();
    const result = await startOrResumeShift(db, 42, "Requested app");
    expect(transaction).toHaveBeenCalledOnce();
    expect(query.mock.calls).toHaveLength(4);
    expect(query.mock.calls[0][0]).toBe(
      "set transaction isolation level read committed"
    );
    expect(query.mock.calls[1][0]).toContain("pg_advisory_xact_lock(718331,");
    expect(query.mock.calls[1][1]).toEqual([42]);
    expect(query.mock.calls[2][0]).toContain("where not exists");
    expect(query.mock.calls[2][0]).toContain("status = 'active'");
    expect(query.mock.calls[2][1]).toContain(42);
    expect(query.mock.calls[3][0]).toContain('"gig_shifts"."userId" =');
    expect(result).toMatchObject({
      id: 7,
      platform: "Existing app",
      startTime: new Date("2026-10-28T12:00:00Z"),
    });
  });
  it("claims only an owned active row and inserts mileage from that exact claim in one statement", async () => {
    const query = vi.fn(async (_statement: string, _params: unknown[]) => ({
      rows: [{ id: 7 }],
    }));
    const client = Object.assign(query, { query });
    const db = drizzle(client as unknown as NeonQueryFunction<false, false>);
    const values = {
      endTime: new Date("2026-10-28T13:00:00Z"),
      durationMinutes: 60,
      grossEarnings: "50.00",
      tips: "2.00",
      bonuses: "1.00",
      totalMiles: "10.00",
    };
    expect(
      await completeShiftWithMileage(db, 42, 7, values, {
        date: new Date("2026-10-28T00:00:00Z"),
        miles: "10.00",
        irsRateCents: "76.00",
        deductionCents: 760,
      })
    ).toBe(true);
    expect(query).toHaveBeenCalledOnce();
    const [statement, params] = query.mock.calls[0];
    expect(statement).toContain("with completed as");
    expect(statement).toContain("and status = 'active' returning id");
    expect(statement).toContain("insert into mileage_logs");
    expect(statement).toContain("from completed where");
    expect(params).toContain(42);
    expect(params).toContain(7);
    expect(params).toContain(760);
  });
});
