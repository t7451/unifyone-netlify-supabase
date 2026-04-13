import { getDb } from "../db";
import { escalationQueue } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";

/**
 * Escalation Trigger System
 * Monitors autonomous operations and automatically escalates decisions based on:
 * - Financial thresholds
 * - Rate limits
 * - Data access policies
 * - Operational constraints
 */

export interface EscalationTriggerConfig {
  actionType: string;
  threshold?: number;
  thresholdUnit?: "USD" | "count" | "percentage";
  authorityLevel: "operator" | "architect" | "cathedral";
  reason: string;
}

// ── Default Escalation Triggers ────────────────────────────────────────────────
export const DEFAULT_ESCALATION_TRIGGERS: Record<
  string,
  EscalationTriggerConfig
> = {
  // Payment Processing
  payment_over_10k: {
    actionType: "payment_processing",
    threshold: 10000,
    thresholdUnit: "USD",
    authorityLevel: "architect",
    reason: "Payment exceeds $10,000 threshold",
  },
  payment_over_50k: {
    actionType: "payment_processing",
    threshold: 50000,
    thresholdUnit: "USD",
    authorityLevel: "cathedral",
    reason: "Payment exceeds $50,000 threshold",
  },

  // Refund Processing
  refund_over_5k: {
    actionType: "refund_issuance",
    threshold: 5000,
    thresholdUnit: "USD",
    authorityLevel: "architect",
    reason: "Refund exceeds $5,000 threshold",
  },
  bulk_refund_over_20k: {
    actionType: "refund_issuance",
    threshold: 20000,
    thresholdUnit: "USD",
    authorityLevel: "cathedral",
    reason: "Bulk refund exceeds $20,000 threshold",
  },

  // Customer Acquisition
  customer_acquisition_high_spend: {
    actionType: "customer_acquisition",
    threshold: 100000,
    thresholdUnit: "USD",
    authorityLevel: "architect",
    reason: "Customer acquisition spend exceeds $100,000",
  },

  // Data Operations
  data_deletion_bulk: {
    actionType: "data_deletion",
    threshold: 1000,
    thresholdUnit: "count",
    authorityLevel: "architect",
    reason: "Bulk data deletion exceeds 1,000 records",
  },
  data_deletion_sensitive: {
    actionType: "data_deletion",
    threshold: 100,
    thresholdUnit: "count",
    authorityLevel: "cathedral",
    reason: "Deletion of sensitive data exceeds 100 records",
  },

  // Pricing Adjustments
  pricing_adjustment_major: {
    actionType: "pricing_adjustment",
    threshold: 25,
    thresholdUnit: "percentage",
    authorityLevel: "architect",
    reason: "Pricing adjustment exceeds 25%",
  },
  pricing_adjustment_critical: {
    actionType: "pricing_adjustment",
    threshold: 50,
    thresholdUnit: "percentage",
    authorityLevel: "cathedral",
    reason: "Pricing adjustment exceeds 50%",
  },

  // Inventory Adjustments
  inventory_adjustment_large: {
    actionType: "inventory_adjustment",
    threshold: 10000,
    thresholdUnit: "count",
    authorityLevel: "architect",
    reason: "Inventory adjustment exceeds 10,000 units",
  },

  // Subscription Changes
  subscription_mass_downgrade: {
    actionType: "subscription_change",
    threshold: 100,
    thresholdUnit: "count",
    authorityLevel: "architect",
    reason: "Mass subscription downgrade affects 100+ customers",
  },

  // AI-Generated Content
  ai_content_high_volume: {
    actionType: "ai_generated_content",
    threshold: 1000,
    thresholdUnit: "count",
    authorityLevel: "architect",
    reason: "AI-generated content batch exceeds 1,000 items",
  },
};

// ── Escalation Trigger Evaluator ───────────────────────────────────────────────
/**
 * Evaluates if an operation should be escalated based on configured triggers.
 * Returns the required authority level if escalation is needed.
 */
export async function evaluateEscalationTriggers(
  actionType: string,
  value: number | undefined,
  unit: "USD" | "count" | "percentage" = "USD"
): Promise<{
  shouldEscalate: boolean;
  authorityLevel?: "operator" | "architect" | "cathedral";
  reason?: string;
  triggeredRules: string[];
}> {
  const triggeredRules: string[] = [];
  let maxAuthorityRequired: "operator" | "architect" | "cathedral" = "operator";

  // ── Check all applicable triggers ──────────────────────────────────────────
  for (const [triggerKey, trigger] of Object.entries(
    DEFAULT_ESCALATION_TRIGGERS
  )) {
    if (trigger.actionType !== actionType) continue;
    if (trigger.thresholdUnit !== unit) continue;
    if (!value || value < (trigger.threshold ?? 0)) continue;

    triggeredRules.push(triggerKey);

    // ── Determine highest authority level needed ───────────────────────────
    const authorityHierarchy: Record<string, number> = {
      operator: 1,
      architect: 2,
      cathedral: 3,
    };

    if (
      authorityHierarchy[trigger.authorityLevel] >
      authorityHierarchy[maxAuthorityRequired]
    ) {
      maxAuthorityRequired = trigger.authorityLevel;
    }
  }

  return {
    shouldEscalate: triggeredRules.length > 0,
    authorityLevel:
      triggeredRules.length > 0 ? maxAuthorityRequired : undefined,
    reason:
      triggeredRules.length > 0
        ? DEFAULT_ESCALATION_TRIGGERS[triggeredRules[triggeredRules.length - 1]]
            ?.reason
        : undefined,
    triggeredRules,
  };
}

// ── Create Escalation ──────────────────────────────────────────────────────────
/**
 * Creates an escalation queue entry for a triggered operation.
 */
export async function createEscalation(
  auditLogId: number,
  decisionType: string,
  context: Record<string, unknown>,
  authorityLevel: "operator" | "architect" | "cathedral",
  expiresIn: number = 12 * 60 * 60 * 1000 // 12 hours default
) {
  const db = await getDb();
  if (!db) return null;

  const expiresAt = new Date(Date.now() + expiresIn);

  const [result] = await db
    .insert(escalationQueue)
    .values({
      auditLogId,
      decisionType,
      decisionContext: context,
      authorityLevel,
      status: "pending",
      expiresAt,
    })
    .returning();

  return result;
}

// ── Auto-Resolve Expired Escalations ───────────────────────────────────────────
/**
 * Periodically checks for expired escalations and auto-resolves them.
 * Called by background jobs or cron tasks.
 */
export async function autoResolveExpiredEscalations() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  //  // ── Find expired pending escalations ────────────────────────────────
  const expired = await db
    .select()
    .from(escalationQueue)
    .where(
      and(
        eq(escalationQueue.status, "pending"),
        lte(escalationQueue.expiresAt, now)
      )
    );

  // ── Auto-resolve as expired ────────────────────────────────────────────
  for (const escalation of expired) {
    await db
      .update(escalationQueue)
      .set({
        status: "expired",
        resolutionNotes: "Auto-resolved: Escalation window expired",
      })
      .where(eq(escalationQueue.id, escalation.id));
  }

  return expired.length;
}

// ── Get Escalation Status ──────────────────────────────────────────────────────
/**
 * Retrieves the current escalation status for an operation.
 */
export async function getEscalationStatus(auditLogId: number) {
  const db = await getDb();
  if (!db) return null;

  const escalation = await db
    .select()
    .from(escalationQueue)
    .where(eq(escalationQueue.auditLogId, auditLogId))
    .limit(1);

  return escalation[0] ?? null;
}

// ── Escalation Statistics ─────────────────────────────────────────────────────
/**
 * Computes escalation statistics for the governance dashboard.
 */
export async function getEscalationStats() {
  const db = await getDb();
  if (!db) {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      avgResolutionTime: 0,
    };
  }

  const escalations = await db.select().from(escalationQueue);

  const stats = {
    total: escalations.length,
    pending: escalations.filter(e => e.status === "pending").length,
    approved: escalations.filter(e => e.status === "approved").length,
    rejected: escalations.filter(e => e.status === "rejected").length,
    expired: escalations.filter(e => e.status === "expired").length,
    avgResolutionTime: 0,
  };

  // ── Calculate average resolution time ───────────────────────────────────
  const resolved = escalations.filter(
    e => e.status !== "pending" && e.resolvedAt
  );
  if (resolved.length > 0) {
    const totalTime = resolved.reduce((sum, e) => {
      const created = new Date(e.createdAt).getTime();
      const resolved = new Date(e.resolvedAt!).getTime();
      return sum + (resolved - created);
    }, 0);
    stats.avgResolutionTime = Math.round(
      totalTime / resolved.length / 1000 / 60
    ); // minutes
  }

  return stats;
}
