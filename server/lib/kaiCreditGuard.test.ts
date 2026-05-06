import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";
import {
  buildKaiUsageLedgerIdempotencyKey,
  checkKaiCreditAllowance,
  debitKaiCreditUsage,
  toKaiLedgerCreditAmount,
} from "./kaiCreditGuard";

type LedgerRow = {
  id: number;
  tenantId: number;
  userId: number;
  creditDelta: number;
  idempotencyKey: string;
  type: string;
  metadata?: Record<string, unknown>;
};

function collectWhereScope(whereClause: unknown) {
  const scope: { tenantId?: number; userId?: number } = {};
  let pendingColumn: "tenantId" | "userId" | null = null;

  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<PropertyKey, unknown>;
    if (record.name === "tenantId" || record.name === "userId") {
      pendingColumn = record.name;
      return;
    }
    if (
      pendingColumn &&
      "value" in record &&
      typeof record.value === "number"
    ) {
      scope[pendingColumn] = record.value;
      pendingColumn = null;
      return;
    }
    if (Array.isArray(record.queryChunks)) {
      record.queryChunks.forEach(walk);
    }
    if (Array.isArray(record.value)) {
      record.value.forEach(walk);
    }
  }

  walk(whereClause);
  return scope;
}

function createLedgerDb(rows: LedgerRow[]) {
  let nextId = rows.length + 1;
  let pendingInsert: Omit<LedgerRow, "id"> | null = null;
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((whereClause: unknown) => {
          const scope = collectWhereScope(whereClause);
          const scopedRows = rows.filter(
            row =>
              row.tenantId === scope.tenantId && row.userId === scope.userId
          );
          return Promise.resolve([
            {
              remaining: scopedRows.reduce(
                (sum, row) => sum + row.creditDelta,
                0
              ),
            },
          ]);
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((value: Omit<LedgerRow, "id">) => {
        pendingInsert = value;
        return {
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => {
              if (!pendingInsert) return Promise.resolve([]);
              const existing = rows.find(
                row => row.idempotencyKey === pendingInsert?.idempotencyKey
              );
              if (existing) return Promise.resolve([]);
              const inserted = { id: nextId++, ...pendingInsert };
              rows.push(inserted);
              return Promise.resolve([{ id: inserted.id }]);
            }),
          })),
        };
      }),
    })),
  };
}

describe("Kai Neon credit guard", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("rounds fractional model minimums up to integer ledger credits", () => {
    expect(toKaiLedgerCreditAmount(1.25)).toBe(2);
    expect(toKaiLedgerCreditAmount(4)).toBe(4);
    expect(toKaiLedgerCreditAmount(0)).toBe(0);
  });

  it("enforces balance from tenant-scoped Neon ledger", async () => {
    vi.mocked(getDb).mockResolvedValue(
      createLedgerDb([
        {
          id: 1,
          tenantId: 44,
          userId: 7,
          type: "purchase",
          creditDelta: 3,
          idempotencyKey: "purchase",
        },
        {
          id: 2,
          tenantId: 45,
          userId: 7,
          type: "purchase",
          creditDelta: 100,
          idempotencyKey: "cross-tenant-purchase",
        },
        {
          id: 3,
          tenantId: 44,
          userId: 8,
          type: "purchase",
          creditDelta: 100,
          idempotencyKey: "cross-user-purchase",
        },
      ]) as any
    );

    await expect(
      checkKaiCreditAllowance({ tenantId: 44, userId: 7, minimumCredits: 1.25 })
    ).resolves.toMatchObject({
      allowed: true,
      balance: 3,
      minimumLedgerCredits: 2,
      enforcement: "neon",
    });

    await expect(
      checkKaiCreditAllowance({ tenantId: 44, userId: 7, minimumCredits: 4 })
    ).resolves.toMatchObject({
      allowed: false,
      balance: 3,
      enforcement: "neon",
    });
  });

  it("ignores cross-tenant ledger rows when checking balance", async () => {
    vi.mocked(getDb).mockResolvedValue(
      createLedgerDb([
        {
          id: 1,
          tenantId: 44,
          userId: 7,
          type: "purchase",
          creditDelta: 1,
          idempotencyKey: "tenant-user-purchase",
        },
        {
          id: 2,
          tenantId: 45,
          userId: 7,
          type: "purchase",
          creditDelta: 99,
          idempotencyKey: "other-tenant-purchase",
        },
      ]) as any
    );

    await expect(
      checkKaiCreditAllowance({ tenantId: 44, userId: 7, minimumCredits: 2 })
    ).resolves.toMatchObject({
      allowed: false,
      balance: 1,
      reason: "Insufficient Kai credits for the selected model.",
    });
  });

  it("fails closed when the Neon ledger is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(
      checkKaiCreditAllowance({ tenantId: 44, userId: 7, minimumCredits: 1 })
    ).resolves.toMatchObject({
      allowed: false,
      balance: null,
      enforcement: "unavailable",
    });
  });

  it("debits usage once for a response idempotency key", async () => {
    const rows: LedgerRow[] = [
      {
        id: 1,
        tenantId: 44,
        userId: 7,
        type: "purchase",
        creditDelta: 10,
        idempotencyKey: "purchase",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(createLedgerDb(rows) as any);
    const idempotencyKey = buildKaiUsageLedgerIdempotencyKey({
      tenantId: 44,
      userId: 7,
      responseId: "chatcmpl_123",
      requestId: "request-1",
    });
    expect(idempotencyKey).toBe("kai_chat_usage:44:7:chatcmpl_123");

    const first = await debitKaiCreditUsage({
      tenantId: 44,
      userId: 7,
      credits: 2.1,
      idempotencyKey,
      metadata: { selectedModel: "kai-fast" },
    });
    const replay = await debitKaiCreditUsage({
      tenantId: 44,
      userId: 7,
      credits: 2.1,
      idempotencyKey,
    });

    expect(first).toMatchObject({ debited: true, chargedCredits: 3 });
    expect(replay).toMatchObject({ debited: false, chargedCredits: 3 });
    expect(rows.filter(row => row.type === "usage")).toHaveLength(1);
    expect(rows.find(row => row.type === "usage")).toMatchObject({
      tenantId: 44,
      userId: 7,
      creditDelta: -3,
      metadata: { selectedModel: "kai-fast" },
    });
    expect(replay.balanceAfter).toBe(7);
  });
});
