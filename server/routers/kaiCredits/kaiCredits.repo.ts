import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  DEFAULT_KAI_CREDIT_PACKAGES,
  type KaiCreditPackageDto,
} from "../../lib/kaiCredits";
import {
  kaiCreditLedger,
  kaiCreditPackages,
  kaiCreditPurchases,
  type KaiCreditPackage,
} from "../../../drizzle/schema";

function toPackageDto(pkg: KaiCreditPackage): KaiCreditPackageDto {
  return {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description ?? "",
    credits: pkg.credits,
    amountCents: pkg.amountCents,
    amountUsd: pkg.amountCents / 100,
    currency: pkg.currency,
    stripePriceId: pkg.stripePriceId,
    isDefault: false,
  };
}

export async function listActivePackages(): Promise<KaiCreditPackageDto[]> {
  const db = await getDb();
  if (!db) return DEFAULT_KAI_CREDIT_PACKAGES;

  try {
    const packages = await db
      .select()
      .from(kaiCreditPackages)
      .where(eq(kaiCreditPackages.isActive, true))
      .orderBy(asc(kaiCreditPackages.sortOrder), asc(kaiCreditPackages.id));

    return packages.length
      ? packages.map(toPackageDto)
      : DEFAULT_KAI_CREDIT_PACKAGES;
  } catch (error) {
    // The kai_credit_packages table may not exist yet (migration 0041 not
    // applied). Fall back to the built-in defaults rather than failing the
    // whole packages query — otherwise the UI shows "no packs available".
    console.warn(
      "[KaiCredits] package table read failed, using defaults:",
      error instanceof Error ? error.message : String(error)
    );
    return DEFAULT_KAI_CREDIT_PACKAGES;
  }
}

/** Returns the resolved Drizzle db client, or null when unavailable. */
export async function getDbOrNull() {
  return getDb();
}

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function getBalance(
  db: DbHandle,
  tenantId: number,
  userId: number
) {
  const [balance] = await db
    .select({
      purchased: sql<number>`coalesce(sum(case when ${kaiCreditLedger.type} = 'purchase' then ${kaiCreditLedger.creditDelta} else 0 end), 0)::int`,
      used: sql<number>`abs(coalesce(sum(case when ${kaiCreditLedger.type} = 'usage' then ${kaiCreditLedger.creditDelta} else 0 end), 0))::int`,
      remaining: sql<number>`coalesce(sum(${kaiCreditLedger.creditDelta}), 0)::int`,
    })
    .from(kaiCreditLedger)
    .where(
      and(
        eq(kaiCreditLedger.tenantId, tenantId),
        eq(kaiCreditLedger.userId, userId)
      )
    );

  return balance;
}

export async function listLedgerTransactions(
  db: DbHandle,
  tenantId: number,
  userId: number,
  limit: number
) {
  return db
    .select({
      id: kaiCreditLedger.id,
      type: kaiCreditLedger.type,
      creditDelta: kaiCreditLedger.creditDelta,
      description: kaiCreditLedger.description,
      purchaseId: kaiCreditLedger.purchaseId,
      createdAt: kaiCreditLedger.createdAt,
    })
    .from(kaiCreditLedger)
    .where(
      and(
        eq(kaiCreditLedger.tenantId, tenantId),
        eq(kaiCreditLedger.userId, userId)
      )
    )
    .orderBy(desc(kaiCreditLedger.createdAt), desc(kaiCreditLedger.id))
    .limit(limit);
}

export async function listPurchases(
  tenantId: number,
  userId: number,
  limit: number
) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select({
      id: kaiCreditPurchases.id,
      packageSlug: kaiCreditPurchases.packageSlug,
      credits: kaiCreditPurchases.credits,
      amountCents: kaiCreditPurchases.amountCents,
      currency: kaiCreditPurchases.currency,
      status: kaiCreditPurchases.status,
      stripeCheckoutSessionId: kaiCreditPurchases.stripeCheckoutSessionId,
      paidAt: kaiCreditPurchases.paidAt,
      fulfilledAt: kaiCreditPurchases.fulfilledAt,
      createdAt: kaiCreditPurchases.createdAt,
    })
    .from(kaiCreditPurchases)
    .where(
      and(
        eq(kaiCreditPurchases.tenantId, tenantId),
        eq(kaiCreditPurchases.userId, userId)
      )
    )
    .orderBy(desc(kaiCreditPurchases.createdAt), desc(kaiCreditPurchases.id))
    .limit(limit);
}

export type CreatePurchaseValues = typeof kaiCreditPurchases.$inferInsert;

export async function insertPurchase(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  values: CreatePurchaseValues
) {
  const [purchase] = await db
    .insert(kaiCreditPurchases)
    .values(values)
    .returning();
  return purchase;
}

export async function markPurchaseCheckoutSession(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  purchaseId: number,
  tenantId: number,
  userId: number,
  sessionId: string
) {
  await db
    .update(kaiCreditPurchases)
    .set({
      stripeCheckoutSessionId: sessionId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(kaiCreditPurchases.id, purchaseId),
        eq(kaiCreditPurchases.tenantId, tenantId),
        eq(kaiCreditPurchases.userId, userId)
      )
    );
}

export async function markPurchaseFailed(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  purchaseId: number,
  tenantId: number,
  userId: number
) {
  await db
    .update(kaiCreditPurchases)
    .set({ status: "failed", updatedAt: new Date() })
    .where(
      and(
        eq(kaiCreditPurchases.id, purchaseId),
        eq(kaiCreditPurchases.tenantId, tenantId),
        eq(kaiCreditPurchases.userId, userId)
      )
    );
}
