import type { Tenant, User } from "../../drizzle/schema";

export const MASTER_CONTROL_ACCOUNT_ID =
  process.env.MASTER_CONTROL_OPEN_ID ?? "7878e6b683d9e665c9d2a296137dda20";

export const MASTER_CONTROL_USERNAME =
  process.env.MASTER_CONTROL_USERNAME ?? "master_control";

export type TenantSettings = Record<string, unknown>;

export type HealthColor = "green" | "yellow" | "red";

export const PLATFORM_MODULES = [
  {
    key: "revenue-command",
    label: "Revenue Command",
    path: "/revenue-command",
    category: "commerce",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "dealflow",
    label: "DealFlow",
    path: "/dashboard/dealflow",
    category: "gig",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "money-manager",
    label: "Money Manager",
    path: "/money-manager",
    category: "gig",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "gig-worker",
    label: "Gig Worker",
    path: "/gig-command",
    category: "gig",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "rewards",
    label: "Rewards",
    path: "/rewards",
    category: "gig",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "gamification",
    label: "Gamification",
    path: "/achievements",
    category: "gig",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "leads",
    label: "Leads",
    path: "/leads",
    category: "growth",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "revenue-streams",
    label: "Revenue Streams",
    path: "/revenue-streams",
    category: "growth",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "affiliate-hub",
    label: "Affiliate Hub",
    path: "/affiliates",
    category: "growth",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "automations",
    label: "Automations",
    path: "/automations",
    category: "operations",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "integrations",
    label: "Integrations",
    path: "/integrations",
    category: "operations",
    defaultEnabled: true,
    flagType: "soft",
    rolloutPercent: 100,
  },
  {
    key: "authorization-hub",
    label: "Authorization Hub",
    path: "/auth-hub",
    category: "security",
    defaultEnabled: true,
    flagType: "hard",
    rolloutPercent: 100,
  },
  {
    key: "developer-hub",
    label: "Developer Hub",
    path: "/developer",
    category: "developer",
    defaultEnabled: false,
    flagType: "soft",
    rolloutPercent: 25,
  },
  {
    key: "governance",
    label: "Governance",
    path: "/master-control",
    category: "ai-governance",
    defaultEnabled: true,
    flagType: "hard",
    rolloutPercent: 100,
  },
  {
    key: "mcp",
    label: "Master Control Plane",
    path: "/master-control",
    category: "platform",
    defaultEnabled: false,
    flagType: "hard",
    rolloutPercent: 0,
  },
] as const;

export type ModuleKey = (typeof PLATFORM_MODULES)[number]["key"];

export const AI_PROMPT_LIBRARY = [
  {
    key: "tenant-health-triage",
    title: "Tenant health triage",
    category: "observability",
    risk: "low",
  },
  {
    key: "billing-save-playbook",
    title: "Billing save playbook",
    category: "billing",
    risk: "medium",
  },
  {
    key: "support-agent-handoff",
    title: "Support agent handoff summary",
    category: "support",
    risk: "low",
  },
  {
    key: "ai-governance-escalation",
    title: "AI governance escalation memo",
    category: "ai-governance",
    risk: "high",
  },
] as const;

export const TENANT_TEMPLATES = {
  "gig-worker-starter": {
    key: "gig-worker-starter",
    name: "Gig Worker Starter",
    description: "Solo operator template with lightweight AI and gig modules.",
    primaryProduct: "gig",
    modules: ["money-manager", "gig-worker", "rewards", "governance"],
    branding: { theme: "starter", accentColor: "#16a34a" },
    aiRouting: {
      defaultModel: "claude-haiku",
      fallbackModel: "claude-sonnet",
      requireEscalationFor: ["billing", "data-export"],
    },
    creditPool: { monthlyLimit: 500, burstLimit: 50 },
  },
  "agency-commerce-pro": {
    key: "agency-commerce-pro",
    name: "Agency Commerce Pro",
    description:
      "Agency storefront template with commerce, automations, and teams.",
    primaryProduct: "commerce",
    modules: [
      "revenue-command",
      "dealflow",
      "automations",
      "integrations",
      "team",
      "governance",
    ],
    branding: { theme: "agency", accentColor: "#2563eb" },
    aiRouting: {
      defaultModel: "claude-sonnet",
      fallbackModel: "claude-haiku",
      requireEscalationFor: ["refund", "bulk-mutation", "impersonation"],
    },
    creditPool: { monthlyLimit: 5000, burstLimit: 500 },
  },
  "white-label-scale": {
    key: "white-label-scale",
    name: "White-Label Scale",
    description: "White-label platform tenant with hardened controls.",
    primaryProduct: "commerce",
    modules: [
      "revenue-command",
      "affiliate-hub",
      "developer-hub",
      "authorization-hub",
      "governance",
      "mcp",
    ],
    branding: { theme: "white-label", accentColor: "#7c3aed" },
    aiRouting: {
      defaultModel: "claude-sonnet",
      fallbackModel: "claude-opus",
      requireEscalationFor: ["billing", "data-export", "owner-transfer"],
    },
    creditPool: { monthlyLimit: 25000, burstLimit: 2500 },
  },
} as const;

export type TemplateKey = keyof typeof TENANT_TEMPLATES;

export function isMasterControlOpenId(openId: string | null | undefined) {
  return Boolean(openId && openId === MASTER_CONTROL_ACCOUNT_ID);
}

export function isMasterControlUser(
  user: Pick<User, "openId"> | null | undefined
) {
  return isMasterControlOpenId(user?.openId);
}

export function asSettings(
  settings: TenantSettings | null | undefined
): TenantSettings {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? { ...settings }
    : {};
}

export function slugifyTenantName(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tenant"
  ).slice(0, 80);
}

export function composeTemplateSettings(
  templateKey: TemplateKey,
  overrides: TenantSettings = {}
): TenantSettings {
  const template = TENANT_TEMPLATES[templateKey];
  const templateModules: readonly string[] = template.modules;

  return {
    ...overrides,
    provisioningTemplate: template.key,
    modules: template.modules,
    branding: {
      ...template.branding,
      ...((overrides.branding as TenantSettings | undefined) ?? {}),
    },
    aiGovernance: {
      routingRules: template.aiRouting,
      creditPool: template.creditPool,
      promptLibraryEnabled: AI_PROMPT_LIBRARY.map(prompt => prompt.key),
      ...((overrides.aiGovernance as TenantSettings | undefined) ?? {}),
    },
    featureFlags: PLATFORM_MODULES.reduce<TenantSettings>((acc, module) => {
      acc[module.key] = {
        enabled: templateModules.includes(module.key),
        rolloutPercent: templateModules.includes(module.key)
          ? 100
          : module.rolloutPercent,
        flagType: module.flagType,
        source: "template",
      };
      return acc;
    }, {}),
  };
}

export function mergeMasterControlSettings(
  settings: TenantSettings | null | undefined,
  patch: TenantSettings
): TenantSettings {
  const current = asSettings(settings);
  const currentMaster = asSettings(current.masterControl as TenantSettings);

  return {
    ...current,
    masterControl: {
      ...currentMaster,
      ...patch,
    },
  };
}

export function upsertFeatureFlagSettings(
  settings: TenantSettings | null | undefined,
  flags: Array<{
    key: string;
    enabled: boolean;
    rolloutPercent?: number;
    flagType?: "soft" | "hard";
    reason?: string;
  }>,
  source: "global" | "tenant"
): TenantSettings {
  const current = asSettings(settings);
  const existingFlags = asSettings(current.featureFlags as TenantSettings);

  for (const flag of flags) {
    existingFlags[flag.key] = {
      ...(asSettings(existingFlags[flag.key] as TenantSettings) ?? {}),
      enabled: flag.enabled,
      rolloutPercent: flag.rolloutPercent ?? 100,
      flagType: flag.flagType ?? "soft",
      reason: flag.reason,
      source,
      updatedAt: new Date().toISOString(),
    };
  }

  return { ...current, featureFlags: existingFlags };
}

export function computeTenantHealth(input: {
  tenant: Pick<Tenant, "status" | "subscriptionStatus" | "shopifySyncEnabled">;
  recentWebhookFailures: number;
  kaiCreditsUsed: number;
  activeUsers: number;
}): { score: number; color: HealthColor; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;

  if (input.tenant.status === "suspended") {
    score -= 45;
    reasons.push("tenant_suspended");
  } else if (input.tenant.status === "cancelled") {
    score -= 60;
    reasons.push("tenant_cancelled");
  } else if (input.tenant.status === "trial") {
    score -= 5;
    reasons.push("trial_status");
  }

  if (input.tenant.subscriptionStatus === "past_due") {
    score -= 35;
    reasons.push("billing_past_due");
  } else if (input.tenant.subscriptionStatus === "cancelled") {
    score -= 45;
    reasons.push("subscription_cancelled");
  }

  if (input.recentWebhookFailures > 0) {
    score -= Math.min(25, input.recentWebhookFailures * 5);
    reasons.push("webhook_failures");
  }

  if (input.tenant.shopifySyncEnabled && input.recentWebhookFailures > 2) {
    score -= 10;
    reasons.push("shopify_sync_at_risk");
  }

  if (input.activeUsers === 0) {
    score -= 10;
    reasons.push("no_recent_active_users");
  }

  if (input.kaiCreditsUsed > 10_000) {
    score -= 10;
    reasons.push("high_ai_usage");
  }

  const bounded = Math.max(0, Math.min(100, score));
  const color: HealthColor =
    bounded >= 80 ? "green" : bounded >= 55 ? "yellow" : "red";

  return { score: bounded, color, reasons };
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const raw =
      value instanceof Date
        ? value.toISOString()
        : typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : String(value ?? "");
    return `"${raw.replace(/"/g, '""')}"`;
  };

  return [
    columns.join(","),
    ...rows.map(row => columns.map(col => escape(row[col])).join(",")),
  ].join("\n");
}
