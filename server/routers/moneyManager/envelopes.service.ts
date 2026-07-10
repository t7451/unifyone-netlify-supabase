/**
 * server/routers/moneyManager/envelopes.service.ts
 *
 * Set-aside / envelope ledger use-cases. `creditEnvelope` is the shared side
 * effect the rule engine calls when a save/transfer/allocation rule fires: it
 * atomically bumps a virtual (tracked) balance and appends a ledger row, keyed
 * idempotently per (rule, shift) so a re-fired rule never double-credits.
 *
 * Mirrors the read-modify-write shape of awardPoints (points.service.ts):
 * read row → newBalance → bump balance → append txn with balanceAfter.
 */

import { TRPCError } from "@trpc/server";
import type { Db } from "./moneyManager.repo";
import * as repo from "./moneyManager.repo";
import type { SavingsEnvelope } from "../../../drizzle/schema";

export type EnvelopeCategory = "tax" | "savings" | "emergency" | "goal";

/** The valid envelope buckets — the single source of truth for category routing. */
export const ENVELOPE_CATEGORIES: readonly EnvelopeCategory[] = [
  "tax",
  "savings",
  "emergency",
  "goal",
];

// Default display names when an envelope is auto-created by category (e.g. the
// first time a save rule fires with no explicit envelope yet).
const ENVELOPE_DEFAULT_NAMES: Record<EnvelopeCategory, string> = {
  tax: "Tax Set-Aside",
  savings: "Savings",
  emergency: "Emergency Fund",
  goal: "Goal",
};

/** Postgres unique-constraint violation (23505), so we don't mask other errors. */
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return (
    e?.code === "23505" ||
    (typeof e?.message === "string" &&
      /duplicate key value|unique constraint/i.test(e.message))
  );
}

export async function creditEnvelope(
  db: Db | null,
  userId: number,
  input: {
    envelopeId?: number;
    category?: EnvelopeCategory;
    amountCents: number;
    action: string;
    ruleId?: number;
    referenceId?: string;
    idempotencyKey?: string;
  }
) {
  if (!db) return;

  // Idempotency: if a txn with this key already exists, this credit already
  // happened — return the recorded balance without crediting again.
  if (input.idempotencyKey) {
    const [existingTxn] = await repo.getEnvelopeTransactionByIdempotencyKey(
      db,
      userId,
      input.idempotencyKey
    );
    if (existingTxn) return existingTxn.balanceAfter;
  }

  // Resolve the envelope: by id, or find-or-create by category.
  let envelope: SavingsEnvelope | undefined;

  if (input.envelopeId != null) {
    [envelope] = await repo.getEnvelopeRow(db, input.envelopeId, userId);
  } else if (input.category) {
    [envelope] = await repo.getEnvelopeByCategory(db, userId, input.category);
    if (!envelope) {
      try {
        const [created] = await repo.insertEnvelope(db, {
          userId,
          name: ENVELOPE_DEFAULT_NAMES[input.category],
          category: input.category,
        });
        [envelope] = await repo.getEnvelopeRow(db, created.id, userId);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Race: a concurrent credit created this category's envelope first —
        // re-read it instead of losing the credit.
        [envelope] = await repo.getEnvelopeByCategory(
          db,
          userId,
          input.category
        );
      }
    }
  }

  if (!envelope) return;

  const newBalance = envelope.balanceCents + input.amountCents;

  // Append the ledger row FIRST so the unique idempotencyKey index is the gate:
  // a concurrent duplicate credit throws here (before the balance is touched)
  // rather than double-incrementing the balance and leaving one ledger row.
  await repo.insertEnvelopeTransaction(db, {
    userId,
    envelopeId: envelope.id,
    amountCents: input.amountCents,
    action: input.action,
    ruleId: input.ruleId ?? null,
    referenceId: input.referenceId ?? null,
    balanceAfter: newBalance,
    idempotencyKey: input.idempotencyKey ?? null,
  });

  await repo.updateEnvelopeBalance(db, envelope.id, userId, input.amountCents);

  return newBalance;
}

export const envelopesService = {
  async createEnvelope(
    userId: number,
    input: { name: string; category: EnvelopeCategory; targetCents?: number }
  ) {
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    try {
      const [created] = await repo.insertEnvelope(db, {
        userId,
        name: input.name,
        category: input.category,
        targetCents: input.targetCents ?? null,
      });
      return { id: created.id, success: true };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An envelope with this name already exists.",
        });
      }
      throw err;
    }
  },

  async listEnvelopes(userId: number) {
    const db = await repo.getDb();
    if (!db) return [];
    return repo.listEnvelopes(db, userId);
  },

  async getEnvelopeBalance(
    userId: number,
    input: { envelopeId?: number; category?: EnvelopeCategory }
  ) {
    const db = await repo.getDb();
    if (!db) return null;

    let envelope: SavingsEnvelope | undefined;
    if (input.envelopeId != null) {
      [envelope] = await repo.getEnvelopeRow(db, input.envelopeId, userId);
    } else if (input.category) {
      [envelope] = await repo.getEnvelopeByCategory(db, userId, input.category);
    }

    if (!envelope) return null;
    return {
      id: envelope.id,
      name: envelope.name,
      category: envelope.category,
      balanceCents: envelope.balanceCents,
      targetCents: envelope.targetCents,
    };
  },

  async getEnvelopeHistory(userId: number, input: { envelopeId: number }) {
    const db = await repo.getDb();
    if (!db) return [];
    return repo.listEnvelopeTransactions(db, input.envelopeId, userId);
  },
};
