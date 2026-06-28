import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { logAudit } from "../../auditLogger";
import {
  buildAuditLogConditions,
  escalationStatusWhere,
  findKillSwitchByName,
  getDb,
  insertAuditLog,
  insertAuditLogReturning,
  insertEscalation,
  insertEscalationNoReturn,
  insertKillSwitch,
  insertRule,
  queryAuditLogs,
  queryEscalations,
  selectActiveDecisionAuthority,
  selectActiveKillSwitches,
  selectActiveRules,
  selectActiveRulesForEntity,
  selectAllEscalations,
  selectKillSwitches,
  updateEscalation,
  updateKillSwitch,
} from "./governance.repo";
import {
  computeMetrics,
  decisionRecommendation,
  defaultDecisionAuthority,
  defaultKillSwitches,
  defaultMetrics,
  defaultRules,
  evaluateDecisionRules,
} from "./governance.service";

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

      const whereClause = buildAuditLogConditions(input);

      const [logs, [countResult]] = await queryAuditLogs(
        db,
        whereClause,
        input?.limit ?? 50,
        input?.offset ?? 0
      );

      return { logs, total: countResult?.count ?? logs.length };
    }),

  // Audit log writes are admin-only. Previously this was `protectedProcedure`,
  // which let any authenticated user insert arbitrary rows into the
  // platform-wide audit log — a defeats-the-point situation for an audit
  // trail. System-side audit writes go through `auditLogger.logAudit()`
  // directly, not via tRPC.
  createAuditLog: adminProcedure
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
      await insertAuditLog(db, {
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

  // logAuditEvent — Create audit log entries with actor, target, metadata.
  // Admin-only: see createAuditLog comment above.
  logAuditEvent: adminProcedure
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
      const [result] = await insertAuditLogReturning(db, {
        userId: ctx.user.id,
        action: input.action,
        entityType: input.target ?? null,
        decisionAuthority: input.actor,
        newValue: input.metadata ?? null,
        escalationTriggered: false,
        createdAt: input.timestamp ? new Date(input.timestamp) : new Date(),
      });
      return { success: true, id: result.id };
    }),

  // ── Escalation Queue ─────────────────────────────────────────────────────────
  // createEscalation — Add items to escalation queue with priority, description, assignee.
  // Admin-only: the escalation queue gates platform-wide governance decisions
  // (refunds, pricing changes, etc.) and must not be writable by ordinary
  // users — that would let them flood the queue and DoS reviewers.
  createEscalation: adminProcedure
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
      const [auditResult] = await insertAuditLogReturning(db, {
        userId: ctx.user.id,
        action: `Escalation created: ${input.description.substring(0, 100)}`,
        entityType: input.decisionType,
        decisionAuthority: input.assignee ?? "unassigned",
        escalationTriggered: true,
        escalationReason: input.description,
      });
      const auditLogId = auditResult.id;

      const [result] = await insertEscalation(db, {
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
        expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000),
      });

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
      const whereClause = escalationStatusWhere(status);

      const [escalations, [countResult]] = await queryEscalations(
        db,
        whereClause,
        input?.limit ?? 50,
        input?.offset ?? 0
      );

      return {
        escalations,
        total: countResult?.count ?? escalations.length,
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
      await updateEscalation(db, input.id, {
        status: input.status,
        resolvedAt: new Date(),
        resolvedBy: ctx.user.id,
        resolutionNotes: input.resolutionNotes,
      });
      return { success: true };
    }),

  // ── Kill Switches ─────────────────────────────────────────────────────────────
  getKillSwitches: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Return default kill switches when DB is unavailable
      return defaultKillSwitches();
    }
    return selectKillSwitches(db);
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
      const existing = await findKillSwitchByName(db, input.switchName);
      if (existing.length > 0) {
        await updateKillSwitch(db, input.switchName, {
          isActive: input.isActive,
          triggeredBy: input.isActive ? ctx.user.id : null,
          triggeredAt: input.isActive ? new Date() : null,
          reason: input.reason,
        });
      } else {
        await insertKillSwitch(db, {
          switchName: input.switchName,
          isActive: input.isActive,
          triggeredBy: input.isActive ? ctx.user.id : null,
          triggeredAt: input.isActive ? new Date() : null,
          reason: input.reason,
          description: `Kill switch for ${input.switchName}`,
        });
      }
      // Log the kill switch action
      await insertAuditLog(db, {
        userId: ctx.user.id,
        action: `Kill switch ${input.isActive ? "ACTIVATED" : "DEACTIVATED"}: ${input.switchName}`,
        entityType: "kill_switch",
        decisionAuthority: "cathedral",
        escalationTriggered: input.isActive,
        escalationReason: input.isActive
          ? `Emergency kill switch activated: ${input.reason ?? "No reason provided"}`
          : undefined,
      });
      void logAudit({
        action: "killswitch.toggle",
        resource: "killswitch",
        resourceId: input.switchName,
        severity: "critical",
        userId: ctx.user.id,
        metadata: { isActive: input.isActive, reason: input.reason },
      }).catch(() => {});
      return { success: true };
    }),

  // ── Governance Rules ──────────────────────────────────────────────────────────
  getRules: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Return default rules when DB is unavailable
      return defaultRules();
    }
    return selectActiveRules(db);
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
      await insertRule(db, {
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
      return defaultMetrics();
    }
    // Compute live metrics from audit logs and escalation queue
    const escalations = await selectAllEscalations(db);
    const activeKillSwitches = await selectActiveKillSwitches(db);
    return computeMetrics(escalations, activeKillSwitches);
  }),

  // ── Decision Authority ────────────────────────────────────────────────────────
  getDecisionAuthority: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return defaultDecisionAuthority();
    }
    return selectActiveDecisionAuthority(db);
  }),

  // ── Claude Decision Evaluation ────────────────────────────────────────────────
  // Admin-only — writes to the platform audit log and escalation queue based
  // on rule evaluation. Allowing any authenticated user to call this would
  // (a) flood the queue, (b) forge audit log entries with arbitrary action
  // strings, and (c) leak the active governance rules via the response.
  evaluateDecision: adminProcedure
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
        rules = await selectActiveRulesForEntity(db, input.entityType);
      }
      // Evaluate rules against the proposed action
      const { violations, shouldEscalate, shouldBlock } = evaluateDecisionRules(
        input,
        rules
      );
      // Log the decision evaluation
      if (db) {
        const [logResult] = await insertAuditLogReturning(db, {
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
        });
        // Create escalation queue entry if needed
        if (shouldEscalate && logResult?.id) {
          await insertEscalationNoReturn(db, {
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
        recommendation: decisionRecommendation(shouldBlock, shouldEscalate),
      };
    }),
});
