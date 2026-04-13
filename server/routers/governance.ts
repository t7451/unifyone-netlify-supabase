import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq, and, gte, lte, like, sql } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  auditLogs,
  escalationQueue,
  decisionAuthority,
  killSwitches,
  governanceRules,
} from "../../drizzle/schema";

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Escape LIKE-pattern wildcards so user input is treated literally. */
const escapeLikeWildcards = (input: string): string =>
  input.replace(/%/g, "\\%").replace(/_/g, "\\_");

// ── Governance Router ──────────────────────────────────────────────────────────
export const governanceRouter = router({
  // ── Audit Logs ──────────────────────────────────────────────────────────────
  getAuditLogs: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
          dateRange: z
            .object({
              from: z.string().datetime(),
              to: z.string().datetime(),
            })
            .optional(),
          actor: z.string().optional(),
          action: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      const conditions = [];
      if (input?.dateRange) {
        conditions.push(
          gte(auditLogs.createdAt, new Date(input.dateRange.from))
        );
        conditions.push(lte(auditLogs.createdAt, new Date(input.dateRange.to)));
      }
      if (input?.actor) {
        conditions.push(
          like(
            auditLogs.decisionAuthority,
            `%${escapeLikeWildcards(input.actor)}%`
          )
        );
      }
      if (input?.action) {
        conditions.push(
          like(auditLogs.action, `%${escapeLikeWildcards(input.action)}%`)
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, [countResult]] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(whereClause)
          .orderBy(desc(auditLogs.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(whereClause),
      ]);

      return { logs, total: (countResult as any)?.count ?? logs.length };
    }),

  createAuditLog: protectedProcedure
    .input(
      z.object({
        action: z.string().min(1).max(255),
        entityType: z.string().max(100).optional(),
        entityId: z.number().optional(),
        oldValue: z.record(z.string(), z.unknown()).optional(),
        newValue: z.record(z.string(), z.unknown()).optional(),
        decisionAuthority: z.string().max(100).optional(),
        escalationTriggered: z.boolean().default(false),
        escalationReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        decisionAuthority: input.decisionAuthority ?? "operator",
        escalationTriggered: input.escalationTriggered,
        escalationReason: input.escalationReason,
      });
      return { success: true };
    }),

  // logAuditEvent — Create audit log entries with actor, target, metadata
  logAuditEvent: protectedProcedure
    .input(
      z.object({
        action: z.string().min(1).max(255),
        actor: z.string().min(1).max(255),
        target: z.string().max(255).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        timestamp: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [result] = await db
        .insert(auditLogs)
        .values({
          userId: ctx.user.id,
          action: input.action,
          entityType: input.target ?? null,
          decisionAuthority: input.actor,
          newValue: input.metadata ?? null,
          escalationTriggered: false,
          createdAt: input.timestamp ? new Date(input.timestamp) : new Date(),
        })
        .returning();
      return { success: true, id: result.id };
    }),

  // ── Escalation Queue ─────────────────────────────────────────────────────────
  // createEscalation — Add items to escalation queue with priority, description, assignee
  createEscalation: protectedProcedure
    .input(
      z.object({
        priority: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().min(1).max(1000),
        assignee: z.string().max(255).optional(),
        decisionType: z.string().max(100).default("manual"),
        authorityLevel: z.string().max(50).default("architect"),
        thresholdExceeded: z.string().optional(),
        thresholdLimit: z.string().optional(),
        expiresInHours: z.number().default(24),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      // First create an audit log entry for the escalation
      const [auditResult] = await db
        .insert(auditLogs)
        .values({
          userId: ctx.user.id,
          action: `Escalation created: ${input.description.substring(0, 100)}`,
          entityType: input.decisionType,
          decisionAuthority: input.assignee ?? "unassigned",
          escalationTriggered: true,
          escalationReason: input.description,
        })
        .returning();
      const auditLogId = auditResult.id;

      const [result] = await db
        .insert(escalationQueue)
        .values({
          auditLogId,
          decisionType: input.decisionType,
          decisionContext: {
            priority: input.priority,
            description: input.description,
            assignee: input.assignee ?? null,
            createdBy: ctx.user.id,
          },
          thresholdExceeded: input.thresholdExceeded,
          thresholdLimit: input.thresholdLimit,
          authorityLevel: input.authorityLevel,
          status: "pending",
          expiresAt: new Date(
            Date.now() + input.expiresInHours * 60 * 60 * 1000
          ),
        })
        .returning();

      return { success: true, id: result.id };
    }),

  // getEscalations — Query escalation queue with status filter and pagination
  getEscalations: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pending", "approved", "rejected", "expired", "all"])
            .default("all"),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { escalations: [], total: 0 };

      const status = input?.status ?? "all";
      const whereClause =
        status !== "all"
          ? eq(
              escalationQueue.status,
              status as "pending" | "approved" | "rejected" | "expired"
            )
          : undefined;

      const [escalations, [countResult]] = await Promise.all([
        db
          .select()
          .from(escalationQueue)
          .where(whereClause)
          .orderBy(desc(escalationQueue.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(escalationQueue)
          .where(whereClause),
      ]);

      return {
        escalations,
        total: (countResult as any)?.count ?? escalations.length,
      };
    }),

  resolveEscalation: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        resolutionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db
        .update(escalationQueue)
        .set({
          status: input.status,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
          resolutionNotes: input.resolutionNotes,
        })
        .where(eq(escalationQueue.id, input.id));
      return { success: true };
    }),

  // ── Kill Switches ─────────────────────────────────────────────────────────────
  getKillSwitches: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Return default kill switches when DB is unavailable
      return [
        {
          id: 1,
          switchName: "autonomous_operations",
          description: "Pause all autonomous AI operations",
          isActive: false,
          triggeredBy: null,
          triggeredAt: null,
          reason: null,
          autoResetEnabled: false,
          autoResetAt: null,
          impactScope: "All AI-driven operations",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          switchName: "payment_processing",
          description: "Halt all payment processing",
          isActive: false,
          triggeredBy: null,
          triggeredAt: null,
          reason: null,
          autoResetEnabled: false,
          autoResetAt: null,
          impactScope: "Stripe, PayPal, Shopify payments",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          switchName: "new_customer_acquisition",
          description: "Pause new customer onboarding",
          isActive: false,
          triggeredBy: null,
          triggeredAt: null,
          reason: null,
          autoResetEnabled: false,
          autoResetAt: null,
          impactScope: "Registration, trial signups",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
    return db.select().from(killSwitches).orderBy(killSwitches.switchName);
  }),

  toggleKillSwitch: adminProcedure
    .input(
      z.object({
        switchName: z.string(),
        isActive: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      // Upsert kill switch
      const existing = await db
        .select()
        .from(killSwitches)
        .where(eq(killSwitches.switchName, input.switchName))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(killSwitches)
          .set({
            isActive: input.isActive,
            triggeredBy: input.isActive ? ctx.user.id : null,
            triggeredAt: input.isActive ? new Date() : null,
            reason: input.reason,
          })
          .where(eq(killSwitches.switchName, input.switchName));
      } else {
        await db.insert(killSwitches).values({
          switchName: input.switchName,
          isActive: input.isActive,
          triggeredBy: input.isActive ? ctx.user.id : null,
          triggeredAt: input.isActive ? new Date() : null,
          reason: input.reason,
          description: `Kill switch for ${input.switchName}`,
        });
      }
      // Log the kill switch action
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: `Kill switch ${input.isActive ? "ACTIVATED" : "DEACTIVATED"}: ${input.switchName}`,
        entityType: "kill_switch",
        decisionAuthority: "cathedral",
        escalationTriggered: input.isActive,
        escalationReason: input.isActive
          ? `Emergency kill switch activated: ${input.reason ?? "No reason provided"}`
          : undefined,
      });
      return { success: true };
    }),

  // ── Governance Rules ──────────────────────────────────────────────────────────
  getRules: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Return default rules when DB is unavailable
      return [
        {
          id: 1,
          ruleName: "Revenue Threshold",
          ruleType: "approval_threshold" as const,
          entityType: "transaction",
          conditionJson: { threshold: 10000, currency: "USD" },
          actionOnViolation: "escalate" as const,
          authorityLevelRequired: "architect",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          ruleName: "Bulk Refund Limit",
          ruleType: "approval_threshold" as const,
          entityType: "order",
          conditionJson: { threshold: 5000, currency: "USD" },
          actionOnViolation: "escalate" as const,
          authorityLevelRequired: "architect",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          ruleName: "API Rate Limit",
          ruleType: "rate_limit" as const,
          entityType: "api",
          conditionJson: { maxCallsPerMinute: 1000 },
          actionOnViolation: "block" as const,
          authorityLevelRequired: "operator",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          ruleName: "Autonomous Decision Scope",
          ruleType: "operational_constraint" as const,
          entityType: "ai_agent",
          conditionJson: {
            maxAutonomousActions: 100,
            requireHumanApproval: ["delete", "bulk_update", "payment"],
          },
          actionOnViolation: "escalate" as const,
          authorityLevelRequired: "cathedral",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
    return db
      .select()
      .from(governanceRules)
      .where(eq(governanceRules.isActive, true))
      .orderBy(governanceRules.ruleName);
  }),

  createRule: adminProcedure
    .input(
      z.object({
        ruleName: z.string().min(1).max(100),
        ruleType: z.enum([
          "approval_threshold",
          "rate_limit",
          "data_access",
          "operational_constraint",
        ]),
        entityType: z.string().max(100).optional(),
        conditionJson: z.record(z.string(), z.unknown()),
        actionOnViolation: z
          .enum(["block", "escalate", "log", "warn"])
          .default("escalate"),
        authorityLevelRequired: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.insert(governanceRules).values({
        ruleName: input.ruleName,
        ruleType: input.ruleType,
        entityType: input.entityType,
        conditionJson: input.conditionJson,
        actionOnViolation: input.actionOnViolation,
        authorityLevelRequired: input.authorityLevelRequired,
        isActive: true,
      });
      return { success: true };
    }),

  // ── Governance Metrics ────────────────────────────────────────────────────────
  getMetrics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalOperations: 0,
        escalationsTriggered: 0,
        escalationsApproved: 0,
        escalationsRejected: 0,
        killSwitchesActivated: 0,
        complianceScore: "100.00",
        averageEscalationTimeMinutes: 0,
      };
    }
    // Compute live metrics from audit logs and escalation queue
    const escalations = await db.select().from(escalationQueue);
    const pending = escalations.filter(e => e.status === "pending").length;
    const approved = escalations.filter(e => e.status === "approved").length;
    const rejected = escalations.filter(e => e.status === "rejected").length;
    const activeKillSwitches = await db
      .select()
      .from(killSwitches)
      .where(eq(killSwitches.isActive, true));
    const totalOps = escalations.length + activeKillSwitches.length * 10;
    const complianceScore =
      totalOps === 0
        ? 100
        : Math.max(0, 100 - (rejected / Math.max(1, escalations.length)) * 100);
    return {
      totalOperations: escalations.length,
      escalationsTriggered: escalations.length,
      escalationsApproved: approved,
      escalationsRejected: rejected,
      escalationsPending: pending,
      killSwitchesActivated: activeKillSwitches.length,
      complianceScore: complianceScore.toFixed(2),
      averageEscalationTimeMinutes: 0,
    };
  }),

  // ── Decision Authority ────────────────────────────────────────────────────────
  getDecisionAuthority: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [
        {
          id: 1,
          userId: 1,
          authorityLevel: "cathedral" as const,
          approvalThreshold: null,
          canOverrideDecisions: true,
          canModifyGovernance: true,
          canAccessAuditLogs: true,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
    return db
      .select()
      .from(decisionAuthority)
      .where(eq(decisionAuthority.active, true));
  }),

  // ── Claude Decision Evaluation ────────────────────────────────────────────────
  evaluateDecision: protectedProcedure
    .input(
      z.object({
        action: z.string().min(1),
        entityType: z.string(),
        value: z.number().optional(),
        context: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      // Fetch active governance rules
      let rules: Array<{
        ruleName: string;
        ruleType: string;
        conditionJson: Record<string, unknown>;
        actionOnViolation: string;
        authorityLevelRequired: string | null;
      }> = [];
      if (db) {
        rules = await db
          .select()
          .from(governanceRules)
          .where(
            and(
              eq(governanceRules.isActive, true),
              eq(governanceRules.entityType, input.entityType)
            )
          );
      }
      // Evaluate rules against the proposed action
      const violations: Array<{
        rule: string;
        action: string;
        reason: string;
      }> = [];
      for (const rule of rules) {
        const condition = rule.conditionJson as Record<string, unknown>;
        if (
          rule.ruleType === "approval_threshold" &&
          input.value !== undefined
        ) {
          const threshold = condition.threshold as number;
          if (input.value > threshold) {
            violations.push({
              rule: rule.ruleName,
              action: rule.actionOnViolation,
              reason: `Value $${input.value} exceeds threshold $${threshold}`,
            });
          }
        }
        if (rule.ruleType === "operational_constraint") {
          const requiresApproval = condition.requireHumanApproval as
            | string[]
            | undefined;
          if (
            requiresApproval?.some(op =>
              input.action.toLowerCase().includes(op)
            )
          ) {
            violations.push({
              rule: rule.ruleName,
              action: rule.actionOnViolation,
              reason: `Action "${input.action}" requires human approval per governance policy`,
            });
          }
        }
      }
      const shouldEscalate = violations.some(
        v => v.action === "escalate" || v.action === "block"
      );
      const shouldBlock = violations.some(v => v.action === "block");
      // Log the decision evaluation
      if (db) {
        const [logResult] = await db
          .insert(auditLogs)
          .values({
            userId: ctx.user.id,
            action: input.action,
            entityType: input.entityType,
            decisionAuthority: shouldEscalate ? "architect" : "operator",
            escalationTriggered: shouldEscalate,
            escalationReason:
              violations.length > 0
                ? violations.map(v => v.reason).join("; ")
                : undefined,
            newValue: input.context,
          })
          .returning();
        // Create escalation queue entry if needed
        if (shouldEscalate && logResult?.id) {
          await db.insert(escalationQueue).values({
            auditLogId: logResult.id,
            decisionType: input.entityType,
            decisionContext: {
              action: input.action,
              violations,
              context: input.context,
            },
            thresholdExceeded: input.value?.toString(),
            authorityLevel: shouldBlock ? "cathedral" : "architect",
            status: "pending",
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
          });
        }
      }
      return {
        allowed: !shouldBlock,
        requiresEscalation: shouldEscalate,
        violations,
        recommendation: shouldBlock
          ? "BLOCKED: This action violates governance rules and cannot proceed."
          : shouldEscalate
            ? "ESCALATED: This action requires approval before proceeding."
            : "APPROVED: This action is within governance parameters.",
      };
    }),
});
