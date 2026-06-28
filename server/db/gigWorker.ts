import { and, eq, sql } from "drizzle-orm";
import {
  InsertGigWorkerPlan,
  InsertGigWorkerSubscription,
  gigAIUsage,
  gigWorkerPlans,
  gigWorkerSubscriptions,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Gig Worker Plans ──────────────────────────────────────────────────────────
export async function getGigWorkerPlans() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gigWorkerPlans)
    .where(eq(gigWorkerPlans.isActive, true))
    .orderBy(gigWorkerPlans.priceMonthly);
}

export async function getGigWorkerPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigWorkerPlans)
    .where(eq(gigWorkerPlans.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getGigWorkerPlanById(planId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigWorkerPlans)
    .where(eq(gigWorkerPlans.id, planId))
    .limit(1);
  return rows[0];
}

// ── Gig Worker Subscriptions ──────────────────────────────────────────────────
export async function getGigWorkerSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigWorkerSubscriptions)
    .where(eq(gigWorkerSubscriptions.userId, userId))
    .limit(1);
  return rows[0];
}

export async function upsertGigWorkerSubscription(
  data: InsertGigWorkerSubscription
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(gigWorkerSubscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: gigWorkerSubscriptions.userId,
      set: {
        planId: data.planId,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        trialEnd: data.trialEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

// ── Gig AI Usage ──────────────────────────────────────────────────────────────
/** Returns or initialises the usage row for the given user + billing period. */
export async function getGigAIUsage(userId: number, billingPeriod: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigAIUsage)
    .where(
      and(
        eq(gigAIUsage.userId, userId),
        eq(gigAIUsage.billingPeriod, billingPeriod)
      )
    )
    .limit(1);
  return rows[0];
}

/** Increments the requestsUsed and tokensUsed counters for the current period. */
export async function incrementGigAIUsage(
  userId: number,
  billingPeriod: string,
  tokens: number,
  context?: string
) {
  const db = await getDb();
  if (!db) return;

  // Use INSERT … ON CONFLICT DO UPDATE so both the initial-insert and
  // the subsequent-increment paths are a single atomic DB round-trip.
  // This eliminates the race condition where two concurrent callers both
  // observe "no row" and both insert, creating a duplicate.
  await db
    .insert(gigAIUsage)
    .values({
      userId,
      billingPeriod,
      requestsUsed: 1,
      tokensUsed: tokens,
      ...(context !== undefined ? { lastContext: context } : {}),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [gigAIUsage.userId, gigAIUsage.billingPeriod],
      set: {
        requestsUsed: sql`${gigAIUsage.requestsUsed} + 1`,
        tokensUsed: sql`${gigAIUsage.tokensUsed} + ${tokens}`,
        ...(context !== undefined ? { lastContext: context } : {}),
        updatedAt: new Date(),
      },
    });
}

/** Seed the gig worker default plans if the table is empty. */
export async function seedGigWorkerPlans(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // onConflictDoUpdate refreshes the marketing fields on every deploy so the
  // code is the single source of truth for pricing/features — while preserving
  // the Stripe price IDs (seeded separately) by NOT including them in the set.
  const defaults: InsertGigWorkerPlan[] = [
    {
      name: "Gig Starter",
      slug: "gig-starter",
      tier: "starter",
      description:
        "Free forever — track shifts, log mileage, and run every gig-tax calculator.",
      priceMonthly: "0.00",
      priceYearly: "0.00",
      monthlyAICredits: 25,
      features: ["shift_tracker", "mileage_log", "tax_calculators"],
      isActive: true,
    },
    {
      name: "Gig Pro",
      slug: "gig-pro",
      tier: "pro",
      description:
        "Everything in Starter, plus unlimited saved history, a year-round tax dashboard, priority support — and the AI tools the moment they ship, included.",
      priceMonthly: "4.99",
      priceYearly: "49.00",
      monthlyAICredits: 250,
      features: [
        "shift_tracker",
        "mileage_log",
        "tax_calculators",
        "unlimited_history",
        "tax_dashboard",
        "priority_support",
        "early_ai_access",
      ],
      isActive: true,
    },
    {
      // Hidden at launch (isActive=false) until the AI features are real — kept
      // so its slug/Stripe IDs persist for an easy re-activation later.
      name: "Gig Elite",
      slug: "gig-elite",
      tier: "elite",
      description:
        "Coming soon — full AI earnings strategy, route optimization, and forecasting.",
      priceMonthly: "9.99",
      priceYearly: "99.00",
      monthlyAICredits: 1000,
      features: [
        "shift_tracker",
        "mileage_log",
        "tax_calculators",
        "unlimited_history",
        "tax_dashboard",
        "priority_support",
        "early_ai_access",
      ],
      isActive: false,
    },
  ];

  await db
    .insert(gigWorkerPlans)
    .values(defaults)
    .onConflictDoUpdate({
      target: gigWorkerPlans.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        tier: sql`excluded.tier`,
        priceMonthly: sql`excluded."priceMonthly"`,
        priceYearly: sql`excluded."priceYearly"`,
        monthlyAICredits: sql`excluded."monthlyAICredits"`,
        features: sql`excluded.features`,
        isActive: sql`excluded."isActive"`,
        updatedAt: new Date(),
      },
    });
}
