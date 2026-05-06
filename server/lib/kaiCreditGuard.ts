import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { kaiCreditLedger } from "../../drizzle/schema";

export interface KaiCreditAllowance {
  allowed: boolean;
  minimumCredits: number;
  minimumLedgerCredits: number;
  balance: number | null;
  enforcement: "neon" | "unavailable" | "error";
  reason?: string;
}

export interface KaiCreditDebitResult {
  debited: boolean;
  chargedCredits: number;
  balanceAfter: number;
  ledgerId?: number;
  idempotencyKey: string;
}

function parsePositiveInteger(value: string | number, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${field} for Kai credit ledger`);
  }
  return parsed;
}

export function toKaiLedgerCreditAmount(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  return Math.max(1, Math.ceil(credits));
}

export function buildKaiUsageLedgerIdempotencyKey(input: {
  tenantId?: string | number;
  userId?: string | number;
  responseId?: string | null;
  requestId: string;
}) {
  const stableResponseId = input.responseId?.trim();
  const scope =
    input.tenantId !== undefined && input.userId !== undefined
      ? `${input.tenantId}:${input.userId}:`
      : "";
  return `kai_chat_usage:${scope}${stableResponseId || input.requestId}`.slice(
    0,
    160
  );
}

export async function getKaiCreditBalance(input: {
  tenantId: string | number;
  userId: string | number;
}): Promise<number> {
  const tenantId = parsePositiveInteger(input.tenantId, "tenantId");
  const userId = parsePositiveInteger(input.userId, "userId");
  const db = await getDb();
  if (!db) {
    throw new Error("Database is unavailable");
  }

  const [balance] = await db
    .select({
      remaining: sql<number>`coalesce(sum(${kaiCreditLedger.creditDelta}), 0)::int`,
    })
    .from(kaiCreditLedger)
    .where(
      and(
        eq(kaiCreditLedger.tenantId, tenantId),
        eq(kaiCreditLedger.userId, userId)
      )
    );

  return Number(balance?.remaining ?? 0);
}

export async function checkKaiCreditAllowance(input: {
  tenantId: string | number;
  userId: string | number;
  minimumCredits: number;
}): Promise<KaiCreditAllowance> {
  const minimumCredits = Math.max(0, input.minimumCredits);
  const minimumLedgerCredits = toKaiLedgerCreditAmount(minimumCredits);

  let tenantId: number;
  let userId: number;
  try {
    tenantId = parsePositiveInteger(input.tenantId, "tenantId");
    userId = parsePositiveInteger(input.userId, "userId");
  } catch (error) {
    return {
      allowed: false,
      minimumCredits,
      minimumLedgerCredits,
      balance: 0,
      enforcement: "neon",
      reason:
        error instanceof Error ? error.message : "Invalid Kai credit scope.",
    };
  }

  try {
    const db = await getDb();
    if (!db) {
      return {
        allowed: false,
        minimumCredits,
        minimumLedgerCredits,
        balance: null,
        enforcement: "unavailable",
        reason: "Kai credit ledger database is unavailable.",
      };
    }

    const [balance] = await db
      .select({
        remaining: sql<number>`coalesce(sum(${kaiCreditLedger.creditDelta}), 0)::int`,
      })
      .from(kaiCreditLedger)
      .where(
        and(
          eq(kaiCreditLedger.tenantId, tenantId),
          eq(kaiCreditLedger.userId, userId)
        )
      );

    const remaining = Number(balance?.remaining ?? 0);
    return {
      allowed: remaining >= minimumLedgerCredits,
      minimumCredits,
      minimumLedgerCredits,
      balance: remaining,
      enforcement: "neon",
      reason:
        remaining >= minimumLedgerCredits
          ? undefined
          : "Insufficient Kai credits for the selected model.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[KaiCredits] Neon balance check failed:", message);
    return {
      allowed: false,
      minimumCredits,
      minimumLedgerCredits,
      balance: null,
      enforcement: "error",
      reason: message,
    };
  }
}

export async function debitKaiCreditUsage(input: {
  tenantId: string | number;
  userId: string | number;
  credits: number;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<KaiCreditDebitResult> {
  const tenantId = parsePositiveInteger(input.tenantId, "tenantId");
  const userId = parsePositiveInteger(input.userId, "userId");
  const chargedCredits = toKaiLedgerCreditAmount(input.credits);
  if (chargedCredits <= 0) {
    throw new Error("Kai credit usage debit must be positive");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is unavailable");
  }

  const [inserted] = await db
    .insert(kaiCreditLedger)
    .values({
      tenantId,
      userId,
      type: "usage",
      creditDelta: -chargedCredits,
      idempotencyKey: input.idempotencyKey,
      description:
        input.description ?? `Kai chat usage (${chargedCredits} credits)`,
      metadata: input.metadata,
    })
    .onConflictDoNothing({ target: kaiCreditLedger.idempotencyKey })
    .returning({ id: kaiCreditLedger.id });

  const balanceAfter = await getKaiCreditBalance({ tenantId, userId });
  return {
    debited: Boolean(inserted),
    chargedCredits,
    balanceAfter,
    ledgerId: inserted?.id,
    idempotencyKey: input.idempotencyKey,
  };
}
