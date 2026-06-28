import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  getActiveRulesForEntity,
  getEscalationById,
  insertAuditLog,
  insertEscalation,
} from "./claudeGovernance.repo";
import {
  evaluateWithClaude,
  requestAlternativeAnalysis as requestAlternativeAnalysisService,
} from "./claudeGovernance.service";

// ── Claude Governance Reasoning Engine ──────────────────────────────────────────
/**
 * Evaluates autonomous decisions using Claude with governance rule checking.
 * Automatically escalates decisions that exceed thresholds or violate rules.
 */
export const claudeGovernanceRouter = router({
  /**
   * Evaluate a proposed autonomous action against governance rules using Claude reasoning.
   * Returns decision recommendation and creates escalation if needed.
   */
  // Admin-only: invokes Claude on every call and writes to the platform-wide
  // escalationQueue/auditLogs tables. Allowing arbitrary authenticated users
  // would let them burn LLM budget and seed the governance queue with noise.
  evaluateAutonomousAction: adminProcedure
    .input(
      z.object({
        actionType: z.enum([
          "payment_processing",
          "refund_issuance",
          "customer_acquisition",
          "data_deletion",
          "pricing_adjustment",
          "inventory_adjustment",
          "subscription_change",
          "ai_generated_content",
        ]),
        description: z.string().min(10).max(1000),
        affectedEntities: z.record(z.string(), z.unknown()).optional(),
        estimatedValue: z.number().optional(),
        urgency: z
          .enum(["low", "medium", "high", "critical"])
          .default("medium"),
        context: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable for governance evaluation",
        });
      }

      // ── Fetch applicable governance rules ────────────────────────────────────
      const rules = await getActiveRulesForEntity(db, input.actionType);

      // ── Invoke Claude for decision reasoning (rule-based fallback) ───────────
      const claudeDecision = await evaluateWithClaude(input, rules);

      // ── Create audit log entry ──────────────────────────────────────────────
      const [auditResult] = await insertAuditLog(db, {
        userId: ctx.user.id,
        action: `Autonomous ${input.actionType} evaluation`,
        entityType: input.actionType,
        decisionAuthority: claudeDecision.recommendedAuthority,
        escalationTriggered: claudeDecision.requiresEscalation,
        escalationReason:
          claudeDecision.violations.length > 0
            ? `Claude governance evaluation: ${claudeDecision.violations.join("; ")}`
            : undefined,
        newValue: {
          actionType: input.actionType,
          estimatedValue: input.estimatedValue,
          claudeDecision,
        },
      });

      // ── Create escalation queue entry if needed ─────────────────────────────
      let escalationQueueId: number | null = null;
      if (claudeDecision.requiresEscalation && auditResult?.id) {
        const [escalationRecord] = await insertEscalation(db, {
          auditLogId: auditResult.id,
          decisionType: input.actionType,
          decisionContext: {
            description: input.description,
            estimatedValue: input.estimatedValue,
            claudeReasoning: claudeDecision.reasoning,
            violations: claudeDecision.violations,
          },
          thresholdExceeded: input.estimatedValue?.toString(),
          authorityLevel: claudeDecision.recommendedAuthority,
          status: "pending",
          expiresAt: new Date(
            Date.now() +
              (input.urgency === "critical" ? 1 : 12) * 60 * 60 * 1000
          ),
        });
        escalationQueueId = escalationRecord?.id ?? null;
      }

      return {
        decision: claudeDecision.allowed
          ? "ALLOWED"
          : claudeDecision.requiresEscalation
            ? "ESCALATED"
            : "BLOCKED",
        allowed: claudeDecision.allowed,
        requiresEscalation: claudeDecision.requiresEscalation,
        riskLevel: claudeDecision.riskLevel,
        violations: claudeDecision.violations,
        reasoning: claudeDecision.reasoning,
        recommendedAuthority: claudeDecision.recommendedAuthority,
        escalationId: escalationQueueId,
      };
    }),

  /**
   * Get Claude's reasoning for a specific escalation.
   */
  getEscalationReasoning: adminProcedure
    .input(z.object({ escalationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const escalation = await getEscalationById(db, input.escalationId);

      if (!escalation.length) return null;

      const context = escalation[0].decisionContext as Record<string, unknown>;
      return {
        escalationId: escalation[0].id,
        decisionType: escalation[0].decisionType,
        claudeReasoning: context?.claudeReasoning,
        violations: context?.violations,
        description: context?.description,
        estimatedValue: context?.estimatedValue,
        status: escalation[0].status,
        createdAt: escalation[0].createdAt,
        expiresAt: escalation[0].expiresAt,
      };
    }),

  /**
   * Request Claude to provide additional reasoning or alternative approaches.
   */
  // Admin-only — re-invokes Claude with full context for alternate
  // governance analysis. Same reasoning as evaluateAutonomousAction.
  requestAlternativeAnalysis: adminProcedure
    .input(
      z.object({
        escalationId: z.number(),
        question: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      const escalation = await getEscalationById(db, input.escalationId);

      if (!escalation.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Escalation not found",
        });
      }

      const context = escalation[0].decisionContext as Record<string, unknown>;

      // ── Invoke Claude for alternative analysis ────────────────────────────
      const analysis = await requestAlternativeAnalysisService(
        context,
        input.question
      );

      return {
        escalationId: input.escalationId,
        analysis,
        timestamp: new Date(),
      };
    }),
});
