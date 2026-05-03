import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import {
  auditLogs,
  escalationQueue,
  governanceRules,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

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
      const rules = await db
        .select()
        .from(governanceRules)
        .where(
          and(
            eq(governanceRules.isActive, true),
            eq(governanceRules.entityType, input.actionType)
          )
        );

      // ── Build Claude prompt for decision reasoning ──────────────────────────
      const systemPrompt = `You are an autonomous governance AI assistant for UnifyOne, a Cathedral Framework-based commerce platform. Your role is to evaluate proposed autonomous actions against governance rules and organizational policies.

You have access to the following governance rules:
${rules.map(r => `- ${r.ruleName}: ${JSON.stringify(r.conditionJson)}`).join("\n")}

For each proposed action, you must:
1. Analyze the action against applicable governance rules
2. Identify any rule violations or threshold exceedances
3. Assess the risk level (low, medium, high, critical)
4. Recommend whether to proceed, escalate, or block
5. Provide reasoning for your recommendation

Return a JSON response with: { allowed: boolean, requiresEscalation: boolean, riskLevel: string, violations: string[], reasoning: string, recommendedAuthority: string }`;

      const userPrompt = `Evaluate this autonomous action:

Action Type: ${input.actionType}
Description: ${input.description}
Estimated Value: ${input.estimatedValue ? `$${input.estimatedValue.toLocaleString()}` : "N/A"}
Urgency: ${input.urgency}
Affected Entities: ${input.affectedEntities ? JSON.stringify(input.affectedEntities, null, 2) : "None"}
Context: ${input.context ? JSON.stringify(input.context, null, 2) : "None"}

Based on the governance rules provided, determine if this action should be:
- ALLOWED: Proceed without escalation
- ESCALATED: Requires human approval before proceeding
- BLOCKED: Cannot proceed under any circumstances

Consider factors like:
- Financial thresholds
- Operational constraints
- Data access policies
- Rate limits
- Compliance requirements`;

      // ── Invoke Claude for decision reasoning ────────────────────────────────
      type ClaudeDecision = {
        allowed: boolean;
        requiresEscalation: boolean;
        riskLevel: "low" | "medium" | "high" | string;
        violations: string[];
        reasoning: string;
        recommendedAuthority: string;
      };
      let claudeDecision: ClaudeDecision = {
        allowed: true,
        requiresEscalation: false,
        riskLevel: "low",
        violations: [],
        reasoning: "No governance violations detected",
        recommendedAuthority: "operator",
      };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "governance_decision",
              schema: {
                type: "object",
                properties: {
                  allowed: { type: "boolean" },
                  requiresEscalation: { type: "boolean" },
                  riskLevel: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                  },
                  violations: { type: "array", items: { type: "string" } },
                  reasoning: { type: "string" },
                  recommendedAuthority: {
                    type: "string",
                    enum: ["operator", "architect", "cathedral"],
                  },
                },
                required: [
                  "allowed",
                  "requiresEscalation",
                  "riskLevel",
                  "violations",
                  "reasoning",
                  "recommendedAuthority",
                ],
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (content && typeof content === "string") {
          claudeDecision = JSON.parse(content);
        }
      } catch (error) {
        console.error("[Claude Governance] LLM invocation failed:", error);
        // Fall back to rule-based evaluation
        claudeDecision = evaluateRulesBased(input, rules);
      }

      // ── Create audit log entry ──────────────────────────────────────────────
      const [auditResult] = await db
        .insert(auditLogs)
        .values({
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
        })
        .returning();

      // ── Create escalation queue entry if needed ─────────────────────────────
      let escalationQueueId: number | null = null;
      if (claudeDecision.requiresEscalation && auditResult?.id) {
        const [escalationRecord] = await db
          .insert(escalationQueue)
          .values({
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
          })
          .returning({ id: escalationQueue.id });
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

      const escalation = await db
        .select()
        .from(escalationQueue)
        .where(eq(escalationQueue.id, input.escalationId))
        .limit(1);

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

      const escalation = await db
        .select()
        .from(escalationQueue)
        .where(eq(escalationQueue.id, input.escalationId))
        .limit(1);

      if (!escalation.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Escalation not found",
        });
      }

      const context = escalation[0].decisionContext as Record<string, unknown>;

      // ── Invoke Claude for alternative analysis ────────────────────────────
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an autonomous governance AI for UnifyOne. An escalation has been flagged for human review. Provide thoughtful analysis and alternative approaches.`,
          },
          {
            role: "user",
            content: `Original decision context: ${JSON.stringify(context, null, 2)}

User question: ${input.question}

Provide a detailed response considering:
1. The original governance reasoning
2. Alternative approaches to achieve the goal
3. Risk mitigation strategies
4. Compliance implications`,
          },
        ],
      });

      const analysis =
        response.choices?.[0]?.message?.content ??
        "Unable to generate analysis";

      return {
        escalationId: input.escalationId,
        analysis,
        timestamp: new Date(),
      };
    }),
});

// ── Helper: Rule-Based Fallback Evaluation ─────────────────────────────────────
function evaluateRulesBased(
  input: {
    actionType: string;
    estimatedValue?: number;
    urgency: string;
    context?: Record<string, unknown>;
  },
  rules: Array<{
    ruleName: string;
    conditionJson: Record<string, unknown>;
    actionOnViolation: string;
  }>
) {
  const violations: string[] = [];
  let riskLevel = "low";
  let requiresEscalation = false;

  // ── Check financial thresholds ──────────────────────────────────────────────
  for (const rule of rules) {
    const condition = rule.conditionJson as Record<string, unknown>;
    const threshold = condition.threshold as number | undefined;

    if (threshold && input.estimatedValue && input.estimatedValue > threshold) {
      violations.push(
        `${rule.ruleName}: Amount $${input.estimatedValue} exceeds threshold $${threshold}`
      );
      if (
        rule.actionOnViolation === "escalate" ||
        rule.actionOnViolation === "block"
      ) {
        requiresEscalation = true;
        riskLevel = "high";
      }
    }
  }

  // ── Check urgency ──────────────────────────────────────────────────────────
  if (input.urgency === "critical") {
    riskLevel = "critical";
    requiresEscalation = true;
  } else if (input.urgency === "high") {
    riskLevel = "high";
  }

  return {
    allowed: violations.length === 0,
    requiresEscalation,
    riskLevel,
    violations,
    reasoning:
      violations.length > 0
        ? `Rule violations detected: ${violations.join("; ")}`
        : "No governance violations detected",
    recommendedAuthority:
      riskLevel === "critical"
        ? "cathedral"
        : riskLevel === "high"
          ? "architect"
          : "operator",
  };
}
