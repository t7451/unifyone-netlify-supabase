import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data-access layer so creditEnvelope runs against controlled rows.
// The point is to verify the read-modify-write ledger math and the
// exactly-once idempotency guard — not the SQL itself.
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  getEnvelopeRow: vi.fn(),
  getEnvelopeByCategory: vi.fn(),
  insertEnvelope: vi.fn(),
  updateEnvelopeBalance: vi.fn(),
  insertEnvelopeTransaction: vi.fn(),
  getEnvelopeTransactionByIdempotencyKey: vi.fn(),
  listEnvelopes: vi.fn(),
  listEnvelopeTransactions: vi.fn(),
}));

import * as repo from "./moneyManager.repo";
import { creditEnvelope, envelopesService } from "./envelopes.service";

const mockRepo = vi.mocked(repo);
const DB = {} as never; // truthy handle; the mocked repo ignores it

const envelope = (over: Record<string, unknown> = {}) => ({
  id: 5,
  userId: 7,
  name: "Savings",
  category: "savings",
  balanceCents: 0,
  targetCents: null,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe("creditEnvelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.updateEnvelopeBalance.mockResolvedValue(undefined as never);
    mockRepo.insertEnvelopeTransaction.mockResolvedValue(undefined as never);
    mockRepo.getEnvelopeTransactionByIdempotencyKey.mockResolvedValue(
      [] as never
    );
  });

  it("read-modify-write: bumps balance and appends txn with balanceAfter", async () => {
    mockRepo.getEnvelopeRow.mockResolvedValue([
      envelope({ id: 5, balanceCents: 1000 }),
    ] as never);

    const newBalance = await creditEnvelope(DB, 7, {
      envelopeId: 5,
      amountCents: 2000,
      action: "save",
      ruleId: 3,
      referenceId: "42",
      idempotencyKey: "envelope-credit:3:42",
    });

    // $10.00 existing + $20.00 credit = $30.00
    expect(newBalance).toBe(3000);
    expect(mockRepo.updateEnvelopeBalance).toHaveBeenCalledWith(DB, 5, 7, 2000);
    expect(mockRepo.insertEnvelopeTransaction).toHaveBeenCalledTimes(1);
    const txn = mockRepo.insertEnvelopeTransaction.mock.calls[0][1];
    expect(txn).toMatchObject({
      userId: 7,
      envelopeId: 5,
      amountCents: 2000,
      balanceAfter: 3000,
      ruleId: 3,
      referenceId: "42",
      idempotencyKey: "envelope-credit:3:42",
    });
  });

  it("is idempotent: an existing txn for the key credits nothing new", async () => {
    mockRepo.getEnvelopeTransactionByIdempotencyKey.mockResolvedValue([
      { balanceAfter: 4200 },
    ] as never);

    const result = await creditEnvelope(DB, 7, {
      envelopeId: 5,
      amountCents: 2000,
      action: "save",
      idempotencyKey: "envelope-credit:3:42",
    });

    expect(result).toBe(4200);
    expect(mockRepo.getEnvelopeRow).not.toHaveBeenCalled();
    expect(mockRepo.updateEnvelopeBalance).not.toHaveBeenCalled();
    expect(mockRepo.insertEnvelopeTransaction).not.toHaveBeenCalled();
  });

  it("find-or-create by category when no envelope exists yet", async () => {
    mockRepo.getEnvelopeByCategory.mockResolvedValue([] as never);
    mockRepo.insertEnvelope.mockResolvedValue([{ id: 9 }] as never);
    mockRepo.getEnvelopeRow.mockResolvedValue([
      envelope({ id: 9, category: "tax", balanceCents: 0 }),
    ] as never);

    const newBalance = await creditEnvelope(DB, 7, {
      category: "tax",
      amountCents: 1500,
      action: "save",
    });

    expect(mockRepo.insertEnvelope).toHaveBeenCalledTimes(1);
    expect(newBalance).toBe(1500);
    const txn = mockRepo.insertEnvelopeTransaction.mock.calls[0][1];
    expect(txn.envelopeId).toBe(9);
    expect(txn.balanceAfter).toBe(1500);
  });

  it("no-ops when the db handle is null", async () => {
    const result = await creditEnvelope(null, 7, {
      envelopeId: 5,
      amountCents: 2000,
      action: "save",
    });
    expect(result).toBeUndefined();
    expect(mockRepo.insertEnvelopeTransaction).not.toHaveBeenCalled();
  });
});

describe("envelopesService.getEnvelopeBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getDb.mockResolvedValue(DB);
  });

  it("returns the balance for an envelope resolved by category", async () => {
    mockRepo.getEnvelopeByCategory.mockResolvedValue([
      envelope({
        id: 2,
        category: "tax",
        balanceCents: 8800,
        targetCents: 20000,
      }),
    ] as never);

    const result = await envelopesService.getEnvelopeBalance(7, {
      category: "tax",
    });

    expect(result).toMatchObject({
      id: 2,
      category: "tax",
      balanceCents: 8800,
      targetCents: 20000,
    });
  });

  it("returns null when the envelope does not exist", async () => {
    mockRepo.getEnvelopeByCategory.mockResolvedValue([] as never);
    const result = await envelopesService.getEnvelopeBalance(7, {
      category: "emergency",
    });
    expect(result).toBeNull();
  });
});
