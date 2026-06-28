/**
 * server/routers/moneyManager/rules.service.ts
 *
 * Financial-rules use-cases (list/create/toggle/delete) plus the active
 * subscription entitlement read.
 */

import { TRPCError } from "@trpc/server";
import * as repo from "./moneyManager.repo";
import { awardPoints, POINTS } from "./points.service";
import { checkAndResolveFriendChallengesForUser } from "../../challengeCompletion";

type RuleType = "auto_save" | "budget_cap" | "alert" | "allocation" | "goal";
type TriggerType =
  | "income_received"
  | "expense_over"
  | "balance_below"
  | "balance_above"
  | "scheduled"
  | "manual";
type ActionType = "transfer" | "notify" | "block" | "tag" | "save";

export const rulesService = {
  async listRules(userId: number) {
    const db = await repo.getDb();
    if (!db) return [];
    return repo.listRules(db, userId);
  },

  async createRule(
    userId: number,
    input: {
      name: string;
      description?: string;
      type: RuleType;
      triggerType: TriggerType;
      triggerValue?: number;
      actionType: ActionType;
      actionValue?: number;
      actionPercent?: number;
      category?: string;
      platform?: string;
    }
  ) {
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    await repo.insertRule(db, {
      userId,
      name: input.name,
      description: input.description,
      type: input.type,
      triggerType: input.triggerType,
      triggerValue: input.triggerValue?.toFixed(2),
      actionType: input.actionType,
      actionValue: input.actionValue?.toFixed(2),
      actionPercent: input.actionPercent?.toFixed(2),
      category: input.category,
      platform: input.platform,
    });

    await awardPoints(
      db,
      userId,
      "rule_created",
      POINTS.rule_created,
      `Created financial rule: ${input.name}`
    );

    // Auto-detect friend challenge completion after rule progress updates.
    await checkAndResolveFriendChallengesForUser(userId);

    return { success: true };
  },

  async toggleRule(
    userId: number,
    input: { ruleId: number; enabled: boolean }
  ) {
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    await repo.updateRuleEnabled(db, input.ruleId, userId, input.enabled);
    return { success: true };
  },

  async deleteRule(userId: number, input: { ruleId: number }) {
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    await repo.deleteRule(db, input.ruleId, userId);
    return { success: true };
  },

  async getEntitlement(userId: number) {
    const db = await repo.getDb();
    if (!db) return null;
    const [ent] = await repo.getActiveEntitlement(db, userId);
    return ent ?? null;
  },
};
