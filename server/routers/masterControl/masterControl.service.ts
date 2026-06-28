import type { Tenant, User } from "../../../drizzle/schema";
import {
  AI_PROMPT_LIBRARY,
  PLATFORM_MODULES,
  TENANT_TEMPLATES,
  asSettings,
  computeTenantHealth,
  type TenantSettings,
} from "../../lib/masterControl";

// ── Small pure helpers ─────────────────────────────────────────────────────────
export function getTenantSettings(
  tenant: Pick<Tenant, "settings">
): TenantSettings {
  return asSettings(tenant.settings as TenantSettings | null | undefined);
}

export function getPlanMrr(
  plan: { priceMonthly: string | null } | undefined
): number {
  if (!plan?.priceMonthly) return 0;
  const parsed = Number(plan.priceMonthly);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function latestDate(
  ...values: Array<Date | null | undefined>
): Date | null {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(date => date.getTime())));
}

// ── Snapshot aggregation (pure) ────────────────────────────────────────────────
type Plan = {
  id: number;
  name: string;
  slug: string;
  priceMonthly: string | null;
  priceYearly: string | null;
  isActive: boolean | null;
  features: unknown;
};

type SnapshotData = {
  tenantRows: Tenant[];
  planRows: Plan[];
  userRows: User[];
  tenantUsers: User[];
  aiUsageRows: Array<{ userId: number; requestsUsed: number }>;
  webhookRows: Array<{
    tenantId: number | null;
    status: string;
    createdAt: Date;
  }>;
  orderRows: Array<{ tenantId: number | null; updatedAt: Date | null }>;
  auditRows: Array<{
    id: number;
    action: string;
    entityType: string | null;
    entityId: number | null;
    decisionAuthority: string | null;
    createdAt: Date;
  }>;
  gigSubRows: Array<{ userId: number; status: string }>;
};

/**
 * Build the per-tenant directory used by the snapshot. Pure function — accepts
 * the already-fetched datasets and performs the in-memory aggregation and
 * health scoring. Math is identical to the original inline implementation.
 */
export function buildTenantDirectory(data: SnapshotData, now: number) {
  const {
    tenantRows,
    planRows,
    userRows,
    tenantUsers,
    aiUsageRows,
    webhookRows,
    orderRows,
    gigSubRows,
  } = data;

  const planById = new Map(planRows.map(plan => [plan.id, plan]));
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  return tenantRows.map(tenant => {
    const owner = userRows.find(user => user.id === tenant.ownerId);
    const members = tenantUsers.filter(user => user.tenantId === tenant.id);
    const memberIds = new Set(members.map(user => user.id));
    const tenantAiUsage = aiUsageRows.filter(row => memberIds.has(row.userId));
    const tenantWebhooks = webhookRows.filter(
      row => row.tenantId === tenant.id
    );
    const tenantOrders = orderRows.filter(row => row.tenantId === tenant.id);
    const activeUsers = members.filter(
      user => user.lastSignedIn && user.lastSignedIn.getTime() >= thirtyDaysAgo
    ).length;
    const kaiCreditsUsed = tenantAiUsage.reduce(
      (sum, row) => sum + row.requestsUsed,
      0
    );
    const recentWebhookFailures = tenantWebhooks.filter(
      row => row.status === "failed" && row.createdAt.getTime() >= thirtyDaysAgo
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
}

type TenantDirectory = ReturnType<typeof buildTenantDirectory>;

/**
 * Assemble the full snapshot response from the tenant directory and the
 * supporting datasets. Pure function — identical aggregation to the original.
 */
export function buildSnapshot(
  tenantDirectory: TenantDirectory,
  data: {
    planRows: Plan[];
    webhookRows: Array<{ status: string; createdAt: Date }>;
    auditRows: SnapshotData["auditRows"];
  },
  now: number
) {
  const { planRows, webhookRows, auditRows } = data;
  const planById = new Map(planRows.map(plan => [plan.id, plan]));
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const totalMrr = tenantDirectory.reduce((sum, tenant) => sum + tenant.mrr, 0);
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
            row.status === "failed" && row.createdAt.getTime() >= thirtyDaysAgo
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
}

// ── Billing oversight aggregation (pure) ───────────────────────────────────────
export function buildBillingOversight(tenantRows: Tenant[], planRows: Plan[]) {
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
}
