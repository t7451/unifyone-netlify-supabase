import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonQueryFunction } from "@neondatabase/serverless";

vi.mock("../../db", () => ({ getDb: vi.fn() }));
import { getDb } from "../../db";
import { loadRecordedWork } from "./repo";
const from = new Date("2026-10-01T00:00:00Z");
const through = new Date("2026-10-23T18:30:00Z");
const expenseRange = { startDate: "2026-10-01", endDate: "2026-10-23" };
const query = vi.fn(async (_statement: string, _params: unknown[]) => ({
  rows: [],
}));
beforeEach(() => {
  vi.resetAllMocks();
  query.mockResolvedValue({ rows: [] });
  const client = Object.assign(query, { query });
  vi.mocked(getDb).mockResolvedValue(
    drizzle(client as unknown as NeonQueryFunction<false, false>)
  );
});

describe("owner-scoped profit source queries", () => {
  it("filters completed work by owner and both period boundaries", async () => {
    await loadRecordedWork(42, from, through, expenseRange);
    expect(query).toHaveBeenCalledTimes(3);
    const [statement, params] = query.mock.calls.find(([statement]) =>
      statement.includes('from "gig_shifts"')
    )!;
    expect(statement).toContain('"gig_shifts"."userId" =');
    expect(statement).toContain('"gig_shifts"."status" =');
    expect(statement).toContain('"gig_shifts"."startTime" >=');
    expect(statement).toContain('"gig_shifts"."startTime" <=');
    expect(params).toContain(42);
    expect(params).toContain("completed");
    expect(params).toContain(from.toISOString());
    expect(params).toContain(through.toISOString());
  });
  it("requires both imported rows and committed batches to belong to the same owner", async () => {
    await loadRecordedWork(42, from, through, expenseRange);
    const [statement, params] = query.mock.calls.find(([statement]) =>
      statement.includes('from "imported_earnings"')
    )!;
    expect(statement).toContain('inner join "earnings_import_batches"');
    expect(statement).toContain('"imported_earnings"."userId" =');
    expect(statement).toContain('"earnings_import_batches"."userId" =');
    expect(statement).toContain('"earnings_import_batches"."status" =');
    expect(statement).toContain('"imported_earnings"."earnedDate" >=');
    expect(statement).toContain('"imported_earnings"."earnedDate" <=');
    expect(params.filter(value => value === 42)).toHaveLength(2);
    expect(params).toContain("committed");
  });
  it("reads all owner expense rows within inclusive plain-date bounds, without pagination", async () => {
    await loadRecordedWork(42, from, through, expenseRange);
    const [statement, params] = query.mock.calls.find(([sql]) =>
      sql.includes('from "work_expenses"')
    )!;
    expect(statement).toContain('"work_expenses"."userId" =');
    expect(statement).toContain('"work_expenses"."expenseDate" >=');
    expect(statement).toContain('"work_expenses"."expenseDate" <=');
    expect(statement).not.toMatch(/limit|offset|notes|description/i);
    expect(params).toEqual([42, "2026-10-01", "2026-10-23"]);
  });
  it("retains an upper date bound for all-time expenses with no lower bound", async () => {
    await loadRecordedWork(42, from, through, {
      startDate: null,
      endDate: "2026-10-23",
    });
    const [statement, params] = query.mock.calls.find(([sql]) =>
      sql.includes('from "work_expenses"')
    )!;
    expect(statement).not.toContain('"expenseDate" >=');
    expect(params).toEqual([42, "2026-10-23"]);
  });
  it("does not turn an expense-only query failure into empty costs", async () => {
    query.mockImplementation(async sql => {
      if (sql.includes('from "work_expenses"'))
        throw new Error("expenses unavailable");
      return { rows: [] };
    });
    await expect(
      loadRecordedWork(42, from, through, expenseRange)
    ).rejects.toMatchObject({ cause: { message: "expenses unavailable" } });
  });
  it("reads no bank/provider activity, user notes or raw CSV data", async () => {
    expect(await loadRecordedWork(42, from, through, expenseRange)).toEqual({
      shifts: [],
      imported: [],
      expenses: [],
    });
    for (const [statement] of query.mock.calls) {
      expect(statement).not.toMatch(
        /financial_activity|financial_connections|"notes"|"rawRow"/
      );
    }
  });
  it("throws when storage is unavailable without running a query", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(
      loadRecordedWork(42, from, through, expenseRange)
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(query).not.toHaveBeenCalled();
  });
  it("propagates failed reads rather than reporting a genuine empty period", async () => {
    query.mockRejectedValue(new Error("storage failure"));
    await expect(
      loadRecordedWork(42, from, through, expenseRange)
    ).rejects.toMatchObject({
      cause: { message: "storage failure" },
    });
  });
});
