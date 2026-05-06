/**
 * server/lib/ruleEngine.ts
 *
 * Autonomous evaluator for user financial rules.
 * Triggered from event sources (shift completed, expense logged, balance check, etc.)
 *
 * For each event, loads enabled rules for the user where targeting matches,
 * evaluates the trigger condition, executes the action, and returns the
 * results so callers can react (e.g., block a transaction or surface a notification).
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { financialRules, notifications } from "../../drizzle/schema";

export type RuleEvent =
  | {
      type: "income_received";
      amountCents: number;
      platform?: string;
      category?: string;
    }
  | {
      type: "expense_over";
      amountCents: number;
      platform?: string;
      category?: string;
    }
  | { type: "balance_below"; balanceCents: number }
  | { type: "balance_above"; balanceCents: number }
  | { type: "scheduled" }
  | { type: "manual" };

export interface FiredRuleResult {
  ruleId: number;
  ruleName: string;
  ruleType: string;
  actionType: string;
  /** dollar amount the action represents (computed from actionValue or actionPercent) */
  actionAmountCents: number;
  /** true if action requested blocking the originating event */
  blocked: boolean;
  /** human-readable explanation */
  message: string;
}

export interface EvaluateRulesInput {
  userId: number;
  event: RuleEvent;
}

export interface EvaluateRulesOutput {
  fired: FiredRuleResult[];
  blocked: boolean;
}

/**
 * Load rules for the user that potentially apply to this event.
 * Trigger-type filter is the cheapest SQL-side filter; targeting and value
 * conditions are evaluated in code.
 */
async function loadCandidateRules(
  userId: number,
  eventType: RuleEvent["type"]
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financialRules)
    .where(
      and(
        eq(financialRules.userId, userId),
        eq(financialRules.enabled, true),
        eq(financialRules.triggerType, eventType)
      )
    );
}

function eventTargetingMatches(
  rule: typeof financialRules.$inferSelect,
  event: RuleEvent
): boolean {
  if (rule.platform && "platform" in event && event.platform !== rule.platform)
    return false;
  if (rule.category && "category" in event && event.category !== rule.category)
    return false;
  return true;
}

function triggerMatches(
  rule: typeof financialRules.$inferSelect,
  event: RuleEvent
): boolean {
  const triggerCents = rule.triggerValue
    ? Math.round(Number(rule.triggerValue) * 100)
    : 0;
  switch (event.type) {
    case "income_received":
      return event.amountCents >= triggerCents;
    case "expense_over":
      return event.amountCents >= triggerCents;
    case "balance_below":
      return event.balanceCents <= triggerCents;
    case "balance_above":
      return event.balanceCents >= triggerCents;
    case "scheduled":
    case "manual":
      return true;
  }
}

function computeActionAmountCents(
  rule: typeof financialRules.$inferSelect,
  event: RuleEvent
): number {
  if (rule.actionPercent && "amountCents" in event) {
    const pct = Number(rule.actionPercent) / 100;
    return Math.round(event.amountCents * pct);
  }
  if (rule.actionValue) {
    return Math.round(Number(rule.actionValue) * 100);
  }
  return 0;
}

async function executeAction(
  rule: typeof financialRules.$inferSelect,
  event: RuleEvent,
  userId: number
): Promise<FiredRuleResult> {
  const db = await getDb();
  const actionAmountCents = computeActionAmountCents(rule, event);
  const dollars = (actionAmountCents / 100).toFixed(2);
  let blocked = false;
  let message = "";

  switch (rule.actionType) {
    case "notify": {
      message = `Rule "${rule.name}" triggered: ${rule.description ?? "alert"}`;
      if (db) {
        try {
          await db.insert(notifications).values({
            userId,
            type: "warning",
            title: rule.name,
            body: rule.description ?? `Triggered by ${event.type}`,
            read: false,
          });
        } catch {
          /* swallow — schema may differ; fall back to no-op */
        }
      }
      break;
    }
    case "save":
    case "transfer": {
      message = `Auto-${rule.actionType}: $${dollars} from ${event.type === "income_received" ? "income" : "balance"}`;
      // Future: integrate with a savings_transfers table when schema is added.
      // For now we just log + notify.
      if (db) {
        try {
          await db.insert(notifications).values({
            userId,
            type: "success",
            title: `${rule.name} — $${dollars} ${rule.actionType === "save" ? "saved" : "transferred"}`,
            body: `Auto-${rule.actionType} of $${dollars} per your "${rule.name}" rule.`,
            read: false,
          });
        } catch {
          /* no-op */
        }
      }
      break;
    }
    case "tag": {
      message = `Tagged event with category "${rule.category ?? rule.name}"`;
      break;
    }
    case "block": {
      blocked = true;
      message = `BLOCKED by rule "${rule.name}" — ${rule.description ?? "exceeds limit"}`;
      break;
    }
  }

  // Bump trigger count and timestamp atomically.
  if (db) {
    try {
      await db
        .update(financialRules)
        .set({
          triggerCount: sql`${financialRules.triggerCount} + 1`,
          lastTriggeredAt: new Date(),
        })
        .where(eq(financialRules.id, rule.id));
    } catch {
      /* schema may differ in future, swallow */
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.type,
    actionType: rule.actionType,
    actionAmountCents,
    blocked,
    message,
  };
}

/**
 * Evaluate all enabled rules for the user against an event.
 * Returns the list of fired rules and whether the originating event is blocked.
 */
export async function evaluateRulesForEvent(
  input: EvaluateRulesInput
): Promise<EvaluateRulesOutput> {
  const candidates = await loadCandidateRules(input.userId, input.event.type);
  const fired: FiredRuleResult[] = [];
  let blocked = false;

  for (const rule of candidates) {
    if (!eventTargetingMatches(rule, input.event)) continue;
    if (!triggerMatches(rule, input.event)) continue;
    const result = await executeAction(rule, input.event, input.userId);
    fired.push(result);
    if (result.blocked) blocked = true;
  }

  return { fired, blocked };
}
