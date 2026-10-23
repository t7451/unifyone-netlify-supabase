import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  insert: vi.fn(),
  findByReference: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("./repo", () => repo);
import { canonicalExpense, create, list } from "./service";
import { workExpensesRouter } from "./index";
import {
  resolveExpenseRange,
  resolveExpenseReportingDate,
  validCalendarDate,
} from "./periods";

const reference = "d56e35b6-cce2-4000-9978-15f5870012c3";
const now = Date.parse("2026-10-23T08:00:00Z");
const input = {
  clientReference: reference,
  expenseDate: "2026-10-23",
  amountCents: 12345,
  category: "fuel" as const,
  merchant: " Gas station ",
  notes: " Work travel ",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

describe("manual spending validation", () => {
  it("preserves exact integer cents and normalizes user-provided text", () => {
    expect(canonicalExpense(input)).toEqual({
      clientReference: reference,
      expenseDate: "2026-10-23",
      amountCents: 12345,
      category: "fuel",
      merchant: "Gas station",
      notes: "Work travel",
    });
    expect(
      canonicalExpense({ ...input, merchant: "  ", notes: "" })
    ).toMatchObject({ merchant: null, notes: null });
  });
  it.each([
    { amountCents: 0 },
    { amountCents: -1 },
    { amountCents: 0.1 },
    { amountCents: 100_000_000 },
    { amountCents: NaN },
    { amountCents: Infinity },
    { expenseDate: "2026-02-30" },
    { expenseDate: "0000-01-01" },
    { expenseDate: "2026-10-23T10:00:00Z" },
    { expenseDate: "2026-10-25" },
    { clientReference: "not-a-reference" },
    { category: "personal" },
    { merchant: "x".repeat(101) },
    { notes: "x".repeat(1001) },
  ])("rejects unsupported or unsafe expense fields %j", change => {
    expect(() => canonicalExpense({ ...input, ...change } as never)).toThrow();
    expect(repo.insert).not.toHaveBeenCalled();
  });
  it("allows a plausible local today one date ahead of UTC", () => {
    expect(
      canonicalExpense({ ...input, expenseDate: "2026-10-24" }).expenseDate
    ).toBe("2026-10-24");
  });
  it("does not add mileage deductions or other tax claims to an expense", () => {
    const expense = canonicalExpense(input);
    expect(expense).not.toHaveProperty("deductionCents");
    expect(expense).not.toHaveProperty("taxEligible");
  });
});

describe("calendar reporting periods", () => {
  it("uses seven complete calendar dates including the selected local today", () => {
    expect(resolveExpenseRange("week", "2026-10-23")).toEqual({
      startDate: "2026-10-17",
      endDate: "2026-10-23",
    });
    expect(resolveExpenseRange("month", "2026-10-23")).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-23",
    });
    expect(resolveExpenseRange("year", "2026-10-23")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-10-23",
    });
    expect(resolveExpenseRange("all", "2026-10-23")).toEqual({
      startDate: null,
      endDate: "2026-10-23",
    });
  });
  it("validates real dates and handles leap-day boundaries", () => {
    expect(validCalendarDate("2024-02-29")).toBe(true);
    expect(validCalendarDate("2025-02-29")).toBe(false);
    expect(resolveExpenseRange("week", "2024-03-01")).toEqual({
      startDate: "2024-02-24",
      endDate: "2024-03-01",
    });
    expect(() => resolveExpenseRange("week", "2026-02-30")).toThrow();
  });
  it("anchors the public reporting date within one UTC day rather than accepting arbitrary periods", () => {
    expect(resolveExpenseReportingDate(undefined, now)).toBe("2026-10-23");
    expect(resolveExpenseReportingDate("2026-10-22", now)).toBe("2026-10-22");
    expect(resolveExpenseReportingDate("2026-10-24", now)).toBe("2026-10-24");
    expect(() => resolveExpenseReportingDate("2026-10-21", now)).toThrow();
  });
});

describe("personal ownership, retries and whole-period totals", () => {
  it("returns the same saved expense for exact retry and rejects changed data", async () => {
    repo.findByReference.mockResolvedValue({
      ...canonicalExpense(input),
      id: 42,
      userId: 7,
    });
    expect(await create(7, input)).toEqual({ id: 42 });
    expect(await create(7, input)).toEqual({ id: 42 });
    await expect(
      create(7, { ...input, amountCents: 500 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repo.findByReference).toHaveBeenCalledWith(7, reference);
  });
  it("gets the owner from the authenticated session, never client input", async () => {
    const caller = workExpensesRouter.createCaller({
      user: { id: 7 },
    } as never);
    repo.findByReference.mockResolvedValue({
      ...canonicalExpense(input),
      id: 42,
      userId: 7,
    });
    await caller.create({ ...input, userId: 99 } as never);
    expect(repo.insert).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ amountCents: 12345 })
    );
  });
  it("rejects unauthenticated writes and listing before reaching storage", async () => {
    const caller = workExpensesRouter.createCaller({ user: null } as never);
    await expect(caller.create(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(repo.insert).not.toHaveBeenCalled();
    expect(repo.list).not.toHaveBeenCalled();
  });
  it("keeps totals across the full period rather than deriving them from the visible page", async () => {
    repo.list.mockResolvedValue({
      entries: [{ id: 2, amountCents: 500 }],
      totalsByCategory: [
        { category: "fuel", amountCents: "2000", count: "3" },
        { category: "software", amountCents: "1500", count: "2" },
      ],
    });
    const result = await list(7, {
      period: "month",
      limit: 1,
      offset: 2,
      asOfDate: "2026-10-23",
    });
    expect(result).toMatchObject({
      totalAmountCents: 3500,
      totalEntries: 5,
      limit: 1,
      offset: 2,
      range: { startDate: "2026-10-01", endDate: "2026-10-23" },
    });
    expect(repo.list).toHaveBeenCalledWith(7, result.range, 1, 2);
  });
  it("does not silently round unsafe aggregate totals", async () => {
    repo.list.mockResolvedValue({
      entries: [],
      totalsByCategory: [
        { category: "fuel", amountCents: "9007199254740992", count: "1" },
      ],
    });
    await expect(list(7)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it.each([
    { limit: 101 },
    { limit: 0 },
    { offset: -1 },
    { offset: 100001 },
    { asOfDate: "2025-01-01" },
  ])("rejects invalid pagination or reporting inputs %j", async changes => {
    await expect(list(7, changes)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(repo.list).not.toHaveBeenCalled();
  });
  it("makes deletion retries harmless and scopes deletion to the session owner", async () => {
    const caller = workExpensesRouter.createCaller({
      user: { id: 7 },
    } as never);
    await expect(caller.remove({ expenseId: 42 })).resolves.toEqual({
      removed: true,
    });
    await expect(caller.remove({ expenseId: 42 })).resolves.toEqual({
      removed: true,
    });
    expect(repo.remove).toHaveBeenCalledWith(7, 42);
  });
  it("never exposes raw storage errors or submitted financial values", async () => {
    const caller = workExpensesRouter.createCaller({
      user: { id: 7 },
    } as never);
    repo.insert.mockRejectedValue(
      new Error("postgresql://private-connection expense-data")
    );
    await expect(caller.create(input)).rejects.toMatchObject({
      message: "This expense operation could not finish. Please retry.",
    });
  });
});
