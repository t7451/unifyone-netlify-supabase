import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  auditLogs,
  gigAIUsage,
  gigWorkerSubscriptions,
  orders,
  paypalWebhookEvents,
  plans,
  squareWebhookEvents,
  stripeWebhookEvents,
  tenants,
  users,
  webhookEvents,
  type InsertTenant,
  type Tenant,
  type User,
} from "../../drizzle/schema";
import { logAudit } from "../auditLogger";
import {
  createTenant,
  getAllTenants,
  getDb,
  getPlans,
  getTenantById,
  getTenantBySlug,
} from "../db";
import {
  AI_PROMPT_LIBRARY,
  MASTER_CONTROL_ACCOUNT_ID,
  MASTER_CONTROL_USERNAME,
  PLATFORM_MODULES,
  TENANT_TEMPLATES,
  asSettings,
  composeTemplateSettings,
  computeTenantHealth,
  isMasterControlUser,
  mergeMasterControlSettings,
  slugifyTenantName,
  toCsv,
  upsertFeatureFlagSettings,
  type TemplateKey,
  type TenantSettings,
} from "../lib/masterControl";
import { protectedProcedure, router } from "../_core/trpc";

const tenantStatusSchema = z.enum([
  "active",
  "suspended",
  "trial",
  "cancelled",
]);

const subscriptionStatusSchema = z.enum([
  "active",
  "past_due",
  "cancelled",
  "trialing",
  "none",
]);

const featureFlagInputSchema = z.object({
  key: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
  flagType: z.enum(["soft", "hard"]).optional(),
  reason: z.string().trim().max(500).optional(),
});

const templateKeySchema = z.enum([
  "gig-worker-starter",
  "agency-commerce-pro",
  "white-label-scale",
] satisfies [TemplateKey, TemplateKey, TemplateKey]);

function requireMasterControl(ctx: { user: { openId: string } }) {
  if (!isMasterControlUser(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Master Control is restricted to the platform owner account.",
    });
  }
}

function requireDb<T>(db: T | null): T {
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  }
  return db;
}

async function safeRows<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch {
    return [];
  }
}

function getTenantSettings(tenant: Pick<Tenant, "settings">): TenantSettings {
  return asSettings(tenant.settings as TenantSettings | null | undefined);
}

function getPlanMrr(plan: { priceMonthly: string | null } | undefined): number {
  if (!plan?.priceMonthly) return 0;
  const parsed = Number(plan.priceMonthly);
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestDate(...values: Array<Date | null | undefined>): Date | null {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(date => date.getTime())));
}

async function resolveUniqueSlug(base: string): Promise<string> {
  const cleaned = slugifyTenantName(base);
  for (let i = 0; i < 25; i += 1) {
    const candidate = i === 0 ? cleaned : `${cleaned}-${i + 1}`;
    const existing = await getTenantBySlug(candidate);
    if (!existing) return candidate;
  }
  return `${cleaned}-${randomUUID().slice(0, 8)}`;
}

async function auditMasterControl(opts: {
  ctx: { user: User; req?: { ip?: string; headers?: Record<string, unknown> } };
  action: string;
  tenantId?: number;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  severity?: "low" | "medium" | "high" | "critical";
}) {
  await logAudit({
    userId: opts.ctx.user.id,
    tenantId: opts.tenantId,
    action: opts.action,
    resource: "master_control",
    resourceId: opts.resourceId ?? String(opts.tenantId ?? ""),
    metadata: {
      actorOpenId: opts.ctx.user.openId,
      actorEmail: opts.ctx.user.email,
      ...opts.metadata,
    },
    severity: opts.severity ?? "medium",
    ip: opts.ctx.req?.ip,
    userAgent:
      typeof opts.ctx.req?.headers?.["user-agent"] === "string"
        ? opts.ctx.req.headers["user-agent"]
        : undefined,
  });
}

export const masterControlRouter = router({
  status: protectedProcedure.query(({ ctx }) => {
    const isMasterAccount = isMasterControlUser(ctx.user);

    return {
      isMasterAccount,
      canUseMasterControl: isMasterAccount,
      expectedOpenId: MASTER_CONTROL_ACCOUNT_ID,
      expectedUsername: MASTER_CONTROL_USERNAME,
      account: {
        id: ctx.user.id,
        openId: ctx.user.openId,
        username: ctx.user.username,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
        tenantId: ctx.user.tenantId,
      },
      needsAdminClaim: isMasterAccount && ctx.user.role !== "admin",
      needsUsernameClaim:
        isMasterAccount && ctx.user.username !== MASTER_CONTROL_USERNAME,
    };
  }),

  claimOwnerAccess: protectedProcedure.mutation(async ({ ctx }) => {
    requireMasterControl(ctx);
    const db = requireDb(await getDb());

    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, MASTER_CONTROL_USERNAME))
      .limit(1);

    const usernameAvailable =
      !existingUsername[0] || existingUsername[0].id === ctx.user.id;

    await db
      .update(users)
      .set({
        role: "admin",
        ...(usernameAvailable ? { username: MASTER_CONTROL_USERNAME } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.openId, MASTER_CONTROL_ACCOUNT_ID));

    await auditMasterControl({
      ctx,
      action: "master_control.claim_owner_access",
      metadata: { usernameClaimed: usernameAvailable },
    });

    return {
      success: true,
      role: "admin" as const,
      username: usernameAvailable ? MASTER_CONTROL_USERNAME : ctx.user.username,
      usernameClaimed: usernameAvailable,
    };
  }),

  snapshot: protectedProcedure.query(async ({ ctx }) => {
    requireMasterControl(ctx);
    const db = await getDb();
    const [tenantRows, planRows] = await Promise.all([
      getAllTenants(),
      getPlans(),
    ]);

    const tenantIds = tenantRows.map(tenant => tenant.id);
    const userRows = db
      ? await safeRows(db.select().from(users))
      : ([] as User[]);
    const tenantUsers = userRows.filter(user =>
      user.tenantId ? tenantIds.includes(user.tenantId) : false
    );
    const userIds = tenantUsers.map(user => user.id);

    const [aiUsageRows, webhookRows, orderRows, auditRows, gigSubRows] = db
      ? await Promise.all([
          userIds.length > 0
            ? safeRows(
                db
                  .select()
                  .from(gigAIUsage)
                  .where(inArray(gigAIUsage.userId, userIds))
              )
            : [],
          tenantIds.length > 0
            ? safeRows(
                db
                  .select()
                  .from(webhookEvents)
                  .where(inArray(webhookEvents.tenantId, tenantIds))
              )
            : [],
          tenantIds.length > 0
            ? safeRows(
                db
                  .select()
                  .from(orders)
                  .where(inArray(orders.tenantId, tenantIds))
              )
            : [],
          safeRows(
            db
              .select()
              .from(auditLogs)
              .orderBy(desc(auditLogs.createdAt))
              .limit(50)
          ),
          userIds.length > 0
            ? safeRows(
                db
                  .select()
                  .from(gigWorkerSubscriptions)
                  .where(inArray(gigWorkerSubscriptions.userId, userIds))
              )
            : [],
        ])
      : [[], [], [], [], []];

    const planById = new Map(planRows.map(plan => [plan.id, plan]));
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const tenantDirectory = tenantRows.map(tenant => {
      const owner = userRows.find(user => user.id === tenant.ownerId);
      const members = tenantUsers.filter(user => user.tenantId === tenant.id);
      const memberIds = new Set(members.map(user => user.id));
      const tenantAiUsage = aiUsageRows.filter(row =>
        memberIds.has(row.userId)
      );
      const tenantWebhooks = webhookRows.filter(
        row => row.tenantId === tenant.id
      );
      const tenantOrders = orderRows.filter(row => row.tenantId === tenant.id);
      const activeUsers = members.filter(
        user =>
          user.lastSignedIn && user.lastSignedIn.getTime() >= thirtyDaysAgo
      ).length;
      const kaiCreditsUsed = tenantAiUsage.reduce(
        (sum, row) => sum + row.requestsUsed,
        0
      );
      const recentWebhookFailures = tenantWebhooks.filter(
        row =>
          row.status === "failed" && row.createdAt.getTime() >= thirtyDaysAgo
      ).length;
      const latestWebhook = latestDate(
        ...tenantWebhooks.map(row => row.createdAt)
      );
      const latestOrder = latestDate(...tenantOrders.map(row => row.updatedAt));
      const latestUser = latestDate(...members.map(row => row.lastSignedIn));
      const health = computeTenantHealth({
        tenant,
        activeUsers,
        kaiCreditsUsed,
        recentWebhookFailures,
      });
      const plan = tenant.planId ? planById.get(tenant.planId) : undefined;
      const settings = getTenantSettings(tenant);
      const master = asSettings(settings.masterControl as TenantSettings);

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        status: tenant.status,
        subscriptionStatus: tenant.subscriptionStatus,
        ownerId: tenant.ownerId,
        ownerName: owner?.name ?? null,
        ownerOpenId: owner?.openId ?? null,
        ownerEmail: owner?.email ?? null,
        planId: tenant.planId,
        planName: plan?.name ?? null,
        planSlug: plan?.slug ?? null,
        shopifyShopDomain: tenant.shopifyShopDomain,
        shopifySyncEnabled: tenant.shopifySyncEnabled,
        shopifyCheckoutUrl: tenant.shopifyCheckoutUrl,
        squareLocationId: tenant.squareLocationId,
        n8nWebhookUrl: tenant.n8nWebhookUrl,
        mrr:
          tenant.subscriptionStatus === "active" ||
          tenant.subscriptionStatus === "trialing"
            ? getPlanMrr(plan)
            : 0,
        activeUsers,
        totalUsers: members.length,
        lastActivity: latestDate(
          tenant.updatedAt,
          latestWebhook,
          latestOrder,
          latestUser
        ),
        shopifySyncStatus: {
          connected: Boolean(tenant.shopifyShopDomain),
          enabled: tenant.shopifySyncEnabled,
          shopDomain: tenant.shopifyShopDomain,
          latestWebhookAt: latestWebhook,
          recentFailures: recentWebhookFailures,
          color:
            !tenant.shopifyShopDomain || !tenant.shopifySyncEnabled
              ? "yellow"
              : recentWebhookFailures > 0
                ? "red"
                : "green",
        },
        kaiCreditsUsed,
        gigConnections: gigSubRows.filter(
          sub => memberIds.has(sub.userId) && sub.status === "active"
        ).length,
        healthScore: health.score,
        healthColor: health.color,
        healthReasons: health.reasons,
        featureFlags: settings.featureFlags ?? {},
        modules: settings.modules ?? [],
        aiGovernance: settings.aiGovernance ?? {},
        pendingOwnershipTransfer: master.pendingOwnershipTransfer ?? null,
        dataRetentionOverride: master.dataRetentionOverride ?? null,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };
    });

    const totalMrr = tenantDirectory.reduce(
      (sum, tenant) => sum + tenant.mrr,
      0
    );
    const failedPaymentQueue = tenantDirectory
      .filter(tenant => tenant.subscriptionStatus === "past_due")
      .map(tenant => ({
        tenantId: tenant.id,
        name: tenant.name,
        ownerEmail: tenant.ownerEmail,
        planName: tenant.planName,
        mrrAtRisk: getPlanMrr(
          tenant.planId ? planById.get(tenant.planId) : undefined
        ),
      }));

    return {
      tenants: tenantDirectory,
      plans: planRows.map(plan => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        isActive: plan.isActive,
        features: plan.features ?? [],
      })),
      modules: PLATFORM_MODULES,
      templates: Object.values(TENANT_TEMPLATES),
      aiGovernance: {
        routingRules: Object.values(TENANT_TEMPLATES).map(template => ({
          template: template.key,
          ...template.aiRouting,
        })),
        promptLibrary: AI_PROMPT_LIBRARY,
        usageAnalytics: {
          requestsUsed: tenantDirectory.reduce(
            (sum, tenant) => sum + tenant.kaiCreditsUsed,
            0
          ),
          tenantsAboveBurst: tenantDirectory.filter(
            tenant => tenant.kaiCreditsUsed > 10_000
          ).length,
          placeholder:
            "Detailed model/token costs require provider metering export.",
        },
      },
      observability: {
        platformMetrics: {
          tenantCount: tenantDirectory.length,
          activeTenantCount: tenantDirectory.filter(t => t.status === "active")
            .length,
          suspendedTenantCount: tenantDirectory.filter(
            t => t.status === "suspended"
          ).length,
          totalMrr,
          activeUsers: tenantDirectory.reduce(
            (sum, tenant) => sum + tenant.activeUsers,
            0
          ),
          webhookFailures30d: webhookRows.filter(
            row =>
              row.status === "failed" &&
              row.createdAt.getTime() >= thirtyDaysAgo
          ).length,
        },
        alerts: tenantDirectory
          .filter(tenant => tenant.healthColor !== "green")
          .map(tenant => ({
            tenantId: tenant.id,
            severity: tenant.healthColor === "red" ? "high" : "medium",
            reasons: tenant.healthReasons,
          })),
        auditLogSummary: auditRows.map(row => ({
          id: row.id,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          severity: row.decisionAuthority,
          createdAt: row.createdAt,
        })),
      },
      billing: {
        totalMrr,
        failedPaymentQueue,
        revenueForecast: {
          currentMrr: totalMrr,
          annualRunRate: totalMrr * 12,
          mrrAtRisk: failedPaymentQueue.reduce(
            (sum, tenant) => sum + tenant.mrrAtRisk,
            0
          ),
        },
      },
      securityControls: {
        impersonationMode: "intent-only",
        auditRequired: true,
        ownerTransferRequiresStoredIntent: true,
      },
    };
  }),

  updateTenantControls: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        name: z.string().min(2).max(255).optional(),
        domain: z.string().trim().max(255).nullable().optional(),
        logoUrl: z.string().trim().max(1000).nullable().optional(),
        status: tenantStatusSchema.optional(),
        subscriptionStatus: subscriptionStatusSchema.optional(),
        planId: z.number().nullable().optional(),
        shopifyShopDomain: z.string().trim().max(255).nullable().optional(),
        shopifySyncEnabled: z.boolean().optional(),
        shopifyCheckoutUrl: z.string().trim().max(1000).nullable().optional(),
        squareLocationId: z.string().trim().max(100).nullable().optional(),
        n8nWebhookUrl: z.string().trim().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());

      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.planId != null) {
        const [plan] = await db
          .select({ id: plans.id })
          .from(plans)
          .where(and(eq(plans.id, input.planId), eq(plans.isActive, true)))
          .limit(1);
        if (!plan) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plan is not active or does not exist.",
          });
        }
      }

      const updates: Partial<InsertTenant> = { updatedAt: new Date() };
      for (const key of [
        "name",
        "domain",
        "logoUrl",
        "status",
        "subscriptionStatus",
        "planId",
        "shopifyShopDomain",
        "shopifySyncEnabled",
        "shopifyCheckoutUrl",
        "squareLocationId",
        "n8nWebhookUrl",
      ] as const) {
        if (input[key] !== undefined) updates[key] = input[key] as never;
      }

      await db
        .update(tenants)
        .set(updates)
        .where(eq(tenants.id, input.tenantId));
      await auditMasterControl({
        ctx,
        action: "master_control.update_tenant_controls",
        tenantId: input.tenantId,
        metadata: { updates },
      });
      return { success: true, tenant: await getTenantById(input.tenantId) };
    }),

  quickAction: protectedProcedure
    .input(
      z.discriminatedUnion("action", [
        z.object({
          action: z.literal("suspend"),
          tenantId: z.number(),
          reason: z.string().max(500).optional(),
        }),
        z.object({
          action: z.literal("reactivate"),
          tenantId: z.number(),
          reason: z.string().max(500).optional(),
        }),
        z.object({
          action: z.literal("impersonationIntent"),
          tenantId: z.number(),
          reason: z.string().min(5).max(500),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.action === "impersonationIntent") {
        const intent = {
          id: randomUUID(),
          tenantId: input.tenantId,
          mode: "intent-only" as const,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          requiresExplicitAuthExchange: true,
          reason: input.reason,
        };
        await auditMasterControl({
          ctx,
          action: "master_control.impersonation_intent",
          tenantId: input.tenantId,
          metadata: intent,
          severity: "high",
        });
        return { success: true, intent };
      }

      const status = input.action === "suspend" ? "suspended" : "active";
      await db
        .update(tenants)
        .set({
          status,
          settings: mergeMasterControlSettings(tenant.settings, {
            dataFreeze: status === "suspended",
            lastLifecycleAction: {
              action: input.action,
              reason: input.reason,
              at: new Date().toISOString(),
              by: ctx.user.openId,
            },
          }),
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, input.tenantId));
      await auditMasterControl({
        ctx,
        action: `master_control.${input.action}`,
        tenantId: input.tenantId,
        metadata: { reason: input.reason },
        severity: input.action === "suspend" ? "high" : "medium",
      });

      return { success: true, tenant: await getTenantById(input.tenantId) };
    }),

  exportTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        format: z.enum(["json", "csv"]).default("json"),
        includeAudit: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      const [members, tenantOrders, tenantWebhooks, tenantAudit] =
        await Promise.all([
          safeRows(
            db.select().from(users).where(eq(users.tenantId, input.tenantId))
          ),
          safeRows(
            db.select().from(orders).where(eq(orders.tenantId, input.tenantId))
          ),
          safeRows(
            db
              .select()
              .from(webhookEvents)
              .where(eq(webhookEvents.tenantId, input.tenantId))
          ),
          input.includeAudit
            ? safeRows(
                db
                  .select()
                  .from(auditLogs)
                  .where(eq(auditLogs.entityId, input.tenantId))
                  .orderBy(desc(auditLogs.createdAt))
              )
            : [],
        ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        tenant,
        users: members.map(user => ({
          id: user.id,
          openId: user.openId,
          email: user.email,
          name: user.name,
          role: user.role,
          lastSignedIn: user.lastSignedIn,
        })),
        orders: tenantOrders,
        webhooks: tenantWebhooks,
        auditLogs: tenantAudit,
      };
      await auditMasterControl({
        ctx,
        action: "master_control.export_tenant",
        tenantId: input.tenantId,
        metadata: { format: input.format, includeAudit: input.includeAudit },
        severity: "high",
      });

      if (input.format === "csv") {
        return {
          format: "csv" as const,
          filename: `${tenant.slug}-export.csv`,
          payload: toCsv([
            {
              section: "tenant",
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              status: tenant.status,
              subscriptionStatus: tenant.subscriptionStatus,
            },
            ...payload.users.map(user => ({ section: "user", ...user })),
            ...payload.orders.map(order => ({ section: "order", ...order })),
          ]),
        };
      }

      return {
        format: "json" as const,
        filename: `${tenant.slug}-export.json`,
        payload,
      };
    }),

  cloneTenant: protectedProcedure
    .input(
      z.object({
        sourceTenantId: z.number(),
        name: z.string().trim().min(2).max(255).optional(),
        slug: z.string().trim().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const source = await getTenantById(input.sourceTenantId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      const slug = await resolveUniqueSlug(input.slug || `${source.slug}-test`);
      const clone = await createTenant({
        name: input.name || `${source.name} Test Clone`,
        slug,
        ownerId: source.ownerId,
        planId: source.planId,
        status: "trial",
        subscriptionStatus: "none",
        shopifySyncEnabled: false,
        settings: mergeMasterControlSettings(source.settings, {
          clonedFromTenantId: source.id,
          clonedAt: new Date().toISOString(),
          testMode: true,
        }),
      });
      await auditMasterControl({
        ctx,
        action: "master_control.clone_tenant",
        tenantId: source.id,
        resourceId: String(clone.id),
        metadata: { cloneTenantId: clone.id, slug },
        severity: "high",
      });
      return { success: true, tenant: clone };
    }),

  createTenantFromTemplate: protectedProcedure
    .input(
      z.object({
        template: templateKeySchema,
        name: z.string().trim().min(2).max(255),
        slug: z.string().trim().max(100).optional(),
        ownerId: z.number().optional(),
        planId: z.number().nullable().optional(),
        idempotencyKey: z.string().trim().max(100).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      if (input.idempotencyKey) {
        const existingTenants = await getAllTenants();
        const existing = existingTenants.find(tenant => {
          const master = asSettings(
            getTenantSettings(tenant).masterControl as TenantSettings
          );
          return master.idempotencyKey === input.idempotencyKey;
        });
        if (existing)
          return { success: true, tenant: existing, idempotent: true };
      }
      if (input.planId != null) {
        const [plan] = await db
          .select({ id: plans.id })
          .from(plans)
          .where(and(eq(plans.id, input.planId), eq(plans.isActive, true)))
          .limit(1);
        if (!plan)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plan is not active.",
          });
      }
      const ownerId = input.ownerId ?? ctx.user.id;
      const slug = await resolveUniqueSlug(input.slug || input.name);
      const tenant = await createTenant({
        name: input.name,
        slug,
        ownerId,
        planId: input.planId ?? null,
        status: "trial",
        subscriptionStatus: "none",
        settings: mergeMasterControlSettings(
          composeTemplateSettings(input.template, input.settings),
          {
            createdFromTemplate: input.template,
            idempotencyKey: input.idempotencyKey,
            provisionedBy: ctx.user.openId,
            provisionedAt: new Date().toISOString(),
          }
        ),
      });
      await auditMasterControl({
        ctx,
        action: "master_control.create_tenant_from_template",
        tenantId: tenant.id,
        metadata: { template: input.template, slug, ownerId },
        severity: "high",
      });
      return { success: true, tenant, idempotent: false };
    }),

  bulkOps: protectedProcedure
    .input(
      z.discriminatedUnion("operation", [
        z.object({
          operation: z.literal("massUpgradePlans"),
          tenantIds: z.array(z.number()).min(1),
          planId: z.number(),
        }),
        z.object({
          operation: z.literal("resetCredits"),
          tenantIds: z.array(z.number()).min(1),
          creditBalance: z.number().int().min(0).default(0),
        }),
        z.object({
          operation: z.literal("applyFeatureFlags"),
          tenantIds: z.array(z.number()).optional(),
          scope: z.enum(["global", "tenant"]),
          flags: z.array(featureFlagInputSchema).min(1),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenantIds =
        input.operation === "applyFeatureFlags" && input.scope === "global"
          ? (await getAllTenants()).map(tenant => tenant.id)
          : input.tenantIds;

      if (!tenantIds || tenantIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No tenants selected.",
        });
      }

      if (input.operation === "massUpgradePlans") {
        const [plan] = await db
          .select({ id: plans.id })
          .from(plans)
          .where(and(eq(plans.id, input.planId), eq(plans.isActive, true)))
          .limit(1);
        if (!plan)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plan is not active.",
          });
        await db
          .update(tenants)
          .set({ planId: input.planId, updatedAt: new Date() })
          .where(inArray(tenants.id, tenantIds));
      } else if (input.operation === "resetCredits") {
        await db
          .update(users)
          .set({ creditBalance: input.creditBalance, updatedAt: new Date() })
          .where(inArray(users.tenantId, tenantIds));
      } else {
        const targets = await safeRows(
          db.select().from(tenants).where(inArray(tenants.id, tenantIds))
        );
        await Promise.all(
          targets.map(tenant =>
            db
              .update(tenants)
              .set({
                settings: upsertFeatureFlagSettings(
                  tenant.settings,
                  input.flags,
                  input.scope
                ),
                updatedAt: new Date(),
              })
              .where(eq(tenants.id, tenant.id))
          )
        );
      }

      await auditMasterControl({
        ctx,
        action: `master_control.bulk.${input.operation}`,
        metadata: input,
        severity: "high",
      });
      return { success: true, affectedTenantIds: tenantIds };
    }),

  createOwnershipTransferIntent: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        targetUserId: z.number().optional(),
        targetOpenId: z.string().trim().max(64).optional(),
        targetEmail: z.string().trim().email().optional(),
        reason: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      if (!input.targetUserId && !input.targetOpenId && !input.targetEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provide a target user.",
        });
      }
      const token = randomUUID();
      const intent = {
        token,
        targetUserId: input.targetUserId,
        targetOpenId: input.targetOpenId,
        targetEmail: input.targetEmail,
        reason: input.reason,
        requestedBy: ctx.user.openId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      await db
        .update(tenants)
        .set({
          settings: mergeMasterControlSettings(tenant.settings, {
            pendingOwnershipTransfer: intent,
          }),
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, input.tenantId));
      await auditMasterControl({
        ctx,
        action: "master_control.owner_transfer_intent",
        tenantId: input.tenantId,
        metadata: { ...intent, token: "redacted" },
        severity: "critical",
      });
      return {
        success: true,
        intent: { ...intent, token },
        confirmationInstructions:
          "Call masterControl.confirmOwnershipTransfer with tenantId and token before expiresAt. No email was sent.",
      };
    }),

  confirmOwnershipTransfer: protectedProcedure
    .input(z.object({ tenantId: z.number(), token: z.string().trim().min(10) }))
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      const settings = getTenantSettings(tenant);
      const master = asSettings(settings.masterControl as TenantSettings);
      const pending = asSettings(
        master.pendingOwnershipTransfer as TenantSettings
      );
      if (!pending.token || pending.token !== input.token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid transfer token.",
        });
      }
      if (
        typeof pending.expiresAt !== "string" ||
        Date.parse(pending.expiresAt) < Date.now()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Transfer token expired.",
        });
      }
      let newOwnerId =
        typeof pending.targetUserId === "number"
          ? pending.targetUserId
          : undefined;
      if (!newOwnerId && typeof pending.targetOpenId === "string") {
        const [target] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.openId, pending.targetOpenId))
          .limit(1);
        newOwnerId = target?.id;
      }
      if (!newOwnerId && typeof pending.targetEmail === "string") {
        const [target] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, pending.targetEmail))
          .limit(1);
        newOwnerId = target?.id;
      }
      if (!newOwnerId)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user not found.",
        });
      const nextMaster = { ...master };
      delete nextMaster.pendingOwnershipTransfer;
      await db
        .update(tenants)
        .set({
          ownerId: newOwnerId,
          settings: { ...settings, masterControl: nextMaster },
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, input.tenantId));
      await auditMasterControl({
        ctx,
        action: "master_control.owner_transfer_confirm",
        tenantId: input.tenantId,
        metadata: { previousOwnerId: tenant.ownerId, newOwnerId },
        severity: "critical",
      });
      return {
        success: true,
        tenant: await getTenantById(input.tenantId),
        newOwnerId,
      };
    }),

  moduleRegistry: protectedProcedure.query(({ ctx }) => {
    requireMasterControl(ctx);
    return {
      modules: PLATFORM_MODULES,
      templates: Object.values(TENANT_TEMPLATES),
      promptLibrary: AI_PROMPT_LIBRARY,
    };
  }),

  updateFeatureFlags: protectedProcedure
    .input(
      z.object({
        scope: z.enum(["global", "tenant"]),
        tenantId: z.number().optional(),
        flags: z.array(featureFlagInputSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const targets =
        input.scope === "global"
          ? await getAllTenants()
          : input.tenantId
            ? [await getTenantById(input.tenantId)].filter(Boolean)
            : [];
      if (targets.length === 0)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No target tenants.",
        });
      await Promise.all(
        targets.map(tenant =>
          db
            .update(tenants)
            .set({
              settings: upsertFeatureFlagSettings(
                tenant!.settings,
                input.flags,
                input.scope
              ),
              updatedAt: new Date(),
            })
            .where(eq(tenants.id, tenant!.id))
        )
      );
      await auditMasterControl({
        ctx,
        action: "master_control.update_feature_flags",
        metadata: input,
        severity: "high",
      });
      return {
        success: true,
        affectedTenantIds: targets.map(tenant => tenant!.id),
      };
    }),

  aiGovernance: protectedProcedure.query(({ ctx }) => {
    requireMasterControl(ctx);
    return {
      routingRules: Object.values(TENANT_TEMPLATES).map(template => ({
        template: template.key,
        ...template.aiRouting,
      })),
      creditPools: Object.values(TENANT_TEMPLATES).map(template => ({
        template: template.key,
        ...template.creditPool,
      })),
      promptLibrary: AI_PROMPT_LIBRARY,
      usageAnalytics: {
        placeholder:
          "Connect provider token-cost exports for exact usage analytics.",
        availableSignals: [
          "gig_ai_usage.requestsUsed",
          "gig_ai_usage.tokensUsed",
        ],
      },
    };
  }),

  grantTemporaryCredits: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        amount: z.number().int().positive().max(1_000_000),
        expiresAt: z.coerce.date(),
        reason: z.string().trim().min(5).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      const settings = getTenantSettings(tenant);
      const aiGovernance = asSettings(settings.aiGovernance as TenantSettings);
      const grants = Array.isArray(aiGovernance.temporaryCreditGrants)
        ? aiGovernance.temporaryCreditGrants
        : [];
      const grant = {
        id: randomUUID(),
        amount: input.amount,
        expiresAt: input.expiresAt.toISOString(),
        reason: input.reason,
        grantedBy: ctx.user.openId,
        grantedAt: new Date().toISOString(),
      };
      await db
        .update(tenants)
        .set({
          settings: {
            ...settings,
            aiGovernance: {
              ...aiGovernance,
              temporaryCreditGrants: [...grants, grant],
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, input.tenantId));
      await auditMasterControl({
        ctx,
        action: "master_control.grant_temporary_credits",
        tenantId: input.tenantId,
        metadata: grant,
        severity: "high",
      });
      return { success: true, grant };
    }),

  observability: protectedProcedure.query(async ({ ctx }) => {
    requireMasterControl(ctx);
    const db = requireDb(await getDb());
    const [stripeEvents, paypalEvents, squareEvents, generalEvents, logs] =
      await Promise.all([
        safeRows(
          db
            .select()
            .from(stripeWebhookEvents)
            .orderBy(desc(stripeWebhookEvents.createdAt))
            .limit(50)
        ),
        safeRows(
          db
            .select()
            .from(paypalWebhookEvents)
            .orderBy(desc(paypalWebhookEvents.createdAt))
            .limit(50)
        ),
        safeRows(
          db
            .select()
            .from(squareWebhookEvents)
            .orderBy(desc(squareWebhookEvents.createdAt))
            .limit(50)
        ),
        safeRows(
          db
            .select()
            .from(webhookEvents)
            .orderBy(desc(webhookEvents.createdAt))
            .limit(50)
        ),
        safeRows(
          db
            .select()
            .from(auditLogs)
            .orderBy(desc(auditLogs.createdAt))
            .limit(100)
        ),
      ]);
    return {
      alerts: [
        ...generalEvents
          .filter(event => event.status === "failed")
          .map(event => ({
            source: event.source,
            severity: "high" as const,
            message: event.error ?? event.eventType,
            createdAt: event.createdAt,
          })),
        ...stripeEvents
          .filter(event => event.status === "failed")
          .map(event => ({
            source: "stripe",
            severity: "high" as const,
            message: event.errorMessage ?? event.eventType,
            createdAt: event.createdAt,
          })),
      ],
      webhookSummaries: {
        stripeEvents,
        paypalEvents,
        squareEvents,
        generalEvents,
      },
      auditLogs: logs,
      securityControls: {
        requireMasterControl: true,
        impersonationIntentOnly: true,
        highRiskActionsAudited: true,
      },
    };
  }),

  billingOversight: protectedProcedure.query(async ({ ctx }) => {
    requireMasterControl(ctx);
    const [tenantRows, planRows] = await Promise.all([
      getAllTenants(),
      getPlans(),
    ]);
    const planById = new Map(planRows.map(plan => [plan.id, plan]));
    const rows = tenantRows.map(tenant => {
      const plan = tenant.planId ? planById.get(tenant.planId) : undefined;
      const mrr = getPlanMrr(plan);
      return {
        tenantId: tenant.id,
        name: tenant.name,
        status: tenant.status,
        subscriptionStatus: tenant.subscriptionStatus,
        planName: plan?.name ?? null,
        mrr,
        periodEnd: tenant.subscriptionCurrentPeriodEnd,
      };
    });
    const failedPaymentQueue = rows.filter(
      row => row.subscriptionStatus === "past_due"
    );
    const currentMrr = rows
      .filter(
        row =>
          row.subscriptionStatus === "active" ||
          row.subscriptionStatus === "trialing"
      )
      .reduce((sum, row) => sum + row.mrr, 0);
    return {
      rows,
      failedPaymentQueue,
      revenueForecast: {
        currentMrr,
        annualRunRate: currentMrr * 12,
        mrrAtRisk: failedPaymentQueue.reduce((sum, row) => sum + row.mrr, 0),
      },
    };
  }),

  complianceExport: protectedProcedure
    .input(z.object({ tenantId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenantRows = input.tenantId
        ? [await getTenantById(input.tenantId)].filter(Boolean)
        : await getAllTenants();
      const tenantIds = tenantRows.map(tenant => tenant!.id);
      const [memberRows, auditRows] = await Promise.all([
        tenantIds.length > 0
          ? safeRows(
              db.select().from(users).where(inArray(users.tenantId, tenantIds))
            )
          : [],
        safeRows(
          db
            .select()
            .from(auditLogs)
            .orderBy(desc(auditLogs.createdAt))
            .limit(500)
        ),
      ]);
      await auditMasterControl({
        ctx,
        action: "master_control.compliance_export",
        metadata: { tenantId: input.tenantId, tenantCount: tenantRows.length },
        severity: "high",
      });
      return {
        exportedAt: new Date().toISOString(),
        tenants: tenantRows,
        users: memberRows.map(user => ({
          id: user.id,
          openId: user.openId,
          email: user.email,
          tenantId: user.tenantId,
          deletedAt: user.deletedAt,
        })),
        auditLogs: auditRows,
      };
    }),

  setDataRetentionOverride: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        days: z.number().int().min(1).max(3650),
        reason: z.string().trim().min(5).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = requireDb(await getDb());
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      const override = {
        days: input.days,
        reason: input.reason,
        updatedBy: ctx.user.openId,
        updatedAt: new Date().toISOString(),
      };
      await db
        .update(tenants)
        .set({
          settings: mergeMasterControlSettings(tenant.settings, {
            dataRetentionOverride: override,
          }),
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, input.tenantId));
      await auditMasterControl({
        ctx,
        action: "master_control.data_retention_override",
        tenantId: input.tenantId,
        metadata: override,
        severity: "high",
      });
      return { success: true, override };
    }),
});
