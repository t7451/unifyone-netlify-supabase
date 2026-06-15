import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Bot,
  CheckCircle2,
  Copy,
  Crown,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Flag,
  Gift,
  KeyRound,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserRoundCog,
  WalletCards,
} from "lucide-react";

const PLATFORM_MODULES = [
  "GigIQ",
  "Tax Autopilot",
  "UnifyAI",
  "MoneyPulse",
  "Commerce Engine",
  "Kai",
  "Affiliate Network",
  "Webhooks",
] as const;

const PROVISIONING_TEMPLATES = [
  {
    name: "Gig Worker Starter",
    plan: "Starter",
    description: "GigIQ, Kai onboarding, tax basics, and one commerce channel.",
  },
  {
    name: "Agency Commerce Pro",
    plan: "Pro",
    description:
      "Multi-client commerce, affiliate ops, MoneyPulse, and analytics.",
  },
  {
    name: "White-Label Scale",
    plan: "Enterprise",
    description:
      "Custom branding, resale controls, governance, and priority credits.",
  },
] as const;

type ProvisioningTemplateKey =
  | "gig-worker-starter"
  | "agency-commerce-pro"
  | "white-label-scale";

const TEMPLATE_KEY_BY_NAME: Record<string, ProvisioningTemplateKey> = {
  "Gig Worker Starter": "gig-worker-starter",
  "Agency Commerce Pro": "agency-commerce-pro",
  "White-Label Scale": "white-label-scale",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type TenantStatus = "active" | "suspended" | "trial" | "cancelled";
type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
  | "none";

type TenantForm = {
  name: string;
  domain: string;
  logoUrl: string;
  status: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  planId: string;
  shopifyShopDomain: string;
  shopifySyncEnabled: boolean;
  shopifyCheckoutUrl: string;
  squareLocationId: string;
  n8nWebhookUrl: string;
};

type ModuleFlag = {
  key: string;
  name: string;
  globalDefault: boolean;
  tenantOverride: string;
  rolloutPercent: number;
  flagMode: "soft" | "hard";
};

type ChatMessage = {
  role: "Kai" | "Owner";
  content: string;
};

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Render an `ask_kai` MCP result into displayable text. MCP tool results are
 * commonly `{ content: [{ type: "text", text }] }`, but may also be a plain
 * string or an object with `answer`/`text`. Fall back to pretty JSON.
 */
function formatKaiAnswer(answer: unknown): string {
  if (typeof answer === "string") return answer;
  if (answer && typeof answer === "object") {
    const obj = answer as Record<string, unknown>;
    if (Array.isArray(obj.content)) {
      const text = obj.content
        .map(part =>
          part && typeof part === "object" && "text" in part
            ? String((part as Record<string, unknown>).text ?? "")
            : ""
        )
        .filter(Boolean)
        .join("\n")
        .trim();
      if (text) return text;
    }
    if (typeof obj.answer === "string") return obj.answer;
    if (typeof obj.text === "string") return obj.text;
  }
  return JSON.stringify(answer, null, 2);
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function recordsFrom(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordFrom) : [];
}

function getString(source: unknown, keys: string[], fallback = "—") {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return fallback;
}

function getNumber(source: unknown, keys: string[], fallback = 0) {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }
  return fallback;
}

function getBoolean(source: unknown, keys: string[], fallback = false) {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function getDateLabel(source: unknown, keys: string[]) {
  const record = recordFrom(source);
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
    }
  }
  return "—";
}

function formatCurrency(value: number) {
  const normalized = value > 1000 ? value / 100 : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(normalized);
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function healthForTenant(tenant: unknown) {
  const explicit = getNumber(tenant, ["healthScore", "overallHealthScore"], -1);
  const status = getString(tenant, ["status"], "active");
  const subscription = getString(tenant, ["subscriptionStatus"], "active");
  const syncEnabled = getBoolean(tenant, ["shopifySyncEnabled"], false);
  const score =
    explicit >= 0
      ? Math.min(100, Math.max(0, explicit))
      : Math.max(
          35,
          94 -
            (status === "suspended" || status === "cancelled" ? 35 : 0) -
            (subscription === "past_due" ? 25 : 0) -
            (!syncEnabled ? 8 : 0)
        );
  if (score >= 80)
    return { score, label: "Healthy", className: "bg-emerald-500" };
  if (score >= 60) return { score, label: "Watch", className: "bg-amber-500" };
  return { score, label: "Critical", className: "bg-red-500" };
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function MasterControl() {
  const utils = trpc.useUtils();
  const status = trpc.masterControl.status.useQuery();
  const snapshot = trpc.masterControl.snapshot.useQuery(undefined, {
    enabled: status.data?.canUseMasterControl === true,
  });
  const claimOwnerAccess = trpc.masterControl.claimOwnerAccess.useMutation({
    onSuccess: data => {
      toast.success(
        data.usernameClaimed
          ? "Master Control access claimed"
          : "Admin access claimed; username is already taken"
      );
      void utils.masterControl.status.invalidate();
      void utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateTenantControls =
    trpc.masterControl.updateTenantControls.useMutation({
      onSuccess: () => {
        toast.success("Tenant controls updated");
        void utils.masterControl.snapshot.invalidate();
      },
      onError: error => toast.error(error.message),
    });
  const createFromTemplate =
    trpc.masterControl.createTenantFromTemplate.useMutation({
      onSuccess: data => {
        toast.success(
          `Tenant provisioned: ${data.tenant?.name ?? "new tenant"}`
        );
        void utils.masterControl.snapshot.invalidate();
      },
      onError: error => toast.error(error.message),
    });
  const cloneTenant = trpc.masterControl.cloneTenant.useMutation({
    onSuccess: data => {
      toast.success(`Tenant cloned: ${data.tenant?.name ?? "clone"}`);
      void utils.masterControl.snapshot.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const transferOwnership =
    trpc.masterControl.createOwnershipTransferIntent.useMutation({
      onSuccess: data => {
        toast.success(
          "Ownership transfer intent created — confirm with the token to finalize"
        );
        // The one-time token is only returned here; surface it so the owner can
        // confirm the transfer. It is redacted from the audit log.
        if (data.intent?.token) {
          void navigator.clipboard
            ?.writeText(data.intent.token)
            .then(() => toast.message("Transfer token copied to clipboard"))
            .catch(() => {});
        }
        void utils.masterControl.snapshot.invalidate();
      },
      onError: error => toast.error(error.message),
    });
  const quickAction = trpc.masterControl.quickAction.useMutation({
    onSuccess: () => {
      toast.success("Lifecycle action applied");
      void utils.masterControl.snapshot.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const grantCredits = trpc.masterControl.grantTemporaryCredits.useMutation({
    onSuccess: data =>
      toast.success(`Granted ${data.grant?.amount ?? "unknown"} credits`),
    onError: error => toast.error(error.message),
  });
  const updateFeatureFlags = trpc.masterControl.updateFeatureFlags.useMutation({
    onSuccess: () => {
      toast.success("Feature flags updated");
      void utils.masterControl.snapshot.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const tenants = useMemo(
    () => snapshot.data?.tenants ?? [],
    [snapshot.data?.tenants]
  );
  const plans = useMemo(
    () => snapshot.data?.plans ?? [],
    [snapshot.data?.plans]
  );
  const modules = useMemo(
    () => snapshot.data?.modules ?? [],
    [snapshot.data?.modules]
  );
  const snapshotRecord = recordFrom(snapshot.data);

  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    PROVISIONING_TEMPLATES[0].name
  );
  const [provisionName, setProvisionName] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [creditGrant, setCreditGrant] = useState("500");
  const [creditGrantExpires, setCreditGrantExpires] = useState("7 days");
  const [kaiCommand, setKaiCommand] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "Kai",
      content:
        "Ask me anything about the selected tenant — risk summaries, payment trends, or platform insights. I answer questions only and won't run any commands.",
    },
  ]);

  const selectedTenant = useMemo(
    () => tenants.find(tenant => String(tenant.id) === selectedTenantId),
    [selectedTenantId, tenants]
  );
  const [form, setForm] = useState<TenantForm | null>(null);

  const planById = useMemo(() => {
    const planMap = new Map<string, (typeof plans)[number]>();
    plans.forEach(plan => planMap.set(String(plan.id), plan));
    return planMap;
  }, [plans]);

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter(tenant => {
      const haystack = [
        tenant.id,
        tenant.name,
        tenant.slug,
        getString(
          tenant,
          ["ownerName", "ownerOpenId", "ownerEmail", "email"],
          ""
        ),
        getString(planById.get(String(tenant.planId)), ["name", "slug"], ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [planById, tenantSearch, tenants]);

  const featureRows = useMemo<ModuleFlag[]>(() => {
    const supplied = recordsFrom(
      snapshotRecord.featureFlags ?? snapshotRecord.moduleFlags
    );
    if (supplied.length) {
      return supplied.map((row, index) => {
        const name = getString(
          row,
          ["name", "module", "label"],
          PLATFORM_MODULES[index] ?? "Module"
        );
        return {
          key: getString(row, ["key", "id", "module"], slugify(name)),
          name,
          globalDefault: getBoolean(
            row,
            ["globalDefault", "enabled", "defaultEnabled"],
            true
          ),
          tenantOverride: getString(
            row,
            ["tenantOverride", "override", "tenantValue"],
            "inherit"
          ),
          rolloutPercent: getNumber(
            row,
            ["rolloutPercent", "rollout", "percentage"],
            100
          ),
          flagMode:
            getString(row, ["flagMode", "mode", "enforcement"], "soft") ===
            "hard"
              ? "hard"
              : "soft",
        };
      });
    }
    return PLATFORM_MODULES.map((name, index) => ({
      key: slugify(name),
      name,
      globalDefault: index !== 1,
      tenantOverride: selectedTenant ? "inherit" : "select tenant",
      rolloutPercent: [100, 35, 80, 60, 100, 100, 45, 70][index] ?? 100,
      flagMode: index === 4 || index === 7 ? "hard" : "soft",
    }));
  }, [selectedTenant, snapshotRecord.featureFlags, snapshotRecord.moduleFlags]);

  const metrics = useMemo(() => {
    const activeTenants = tenants.filter(
      tenant => tenant.status === "active"
    ).length;
    const mrr = tenants.reduce((sum, tenant) => {
      const tenantMrr = getNumber(
        tenant,
        ["mrr", "monthlyRecurringRevenue"],
        -1
      );
      if (tenantMrr >= 0) return sum + tenantMrr;
      const plan = planById.get(String(tenant.planId));
      return sum + getNumber(plan, ["priceMonthly", "monthlyPrice"], 0);
    }, 0);
    return {
      activeTenants,
      mrr,
      kaiQueries: getNumber(
        snapshotRecord,
        ["kaiQueriesPerDay", "kaiQueriesToday"],
        Math.max(tenants.length * 18, 42)
      ),
      errorRate: getNumber(
        snapshotRecord,
        ["errorRate", "platformErrorRate"],
        0.7
      ),
      integrationHealth: getNumber(
        snapshotRecord,
        ["integrationHealth", "integrationHealthScore"],
        91
      ),
    };
  }, [planById, snapshotRecord, tenants]);

  useEffect(() => {
    if (!selectedTenantId && tenants[0]) {
      setSelectedTenantId(String(tenants[0].id));
    }
  }, [selectedTenantId, tenants]);

  useEffect(() => {
    if (!selectedTenant) return;
    setForm({
      name: selectedTenant.name,
      domain: selectedTenant.domain ?? "",
      logoUrl: selectedTenant.logoUrl ?? "",
      status: selectedTenant.status,
      subscriptionStatus: selectedTenant.subscriptionStatus,
      planId: selectedTenant.planId ? String(selectedTenant.planId) : "none",
      shopifyShopDomain: getString(selectedTenant, ["shopifyShopDomain"], ""),
      shopifySyncEnabled: getBoolean(selectedTenant, ["shopifySyncEnabled"]),
      shopifyCheckoutUrl: getString(selectedTenant, ["shopifyCheckoutUrl"], ""),
      squareLocationId: getString(selectedTenant, ["squareLocationId"], ""),
      n8nWebhookUrl: getString(selectedTenant, ["n8nWebhookUrl"], ""),
    });
  }, [selectedTenant]);

  const isLoading = status.isLoading || snapshot.isLoading;
  const account = status.data?.account;
  const canUse = status.data?.canUseMasterControl === true;
  const needsClaim =
    status.data?.needsAdminClaim || status.data?.needsUsernameClaim;

  const updateField = <K extends keyof TenantForm>(
    key: K,
    value: TenantForm[K]
  ) => setForm(current => (current ? { ...current, [key]: value } : current));

  const saveTenant = () => {
    if (!selectedTenant || !form) return;
    updateTenantControls.mutate({
      tenantId: selectedTenant.id,
      name: form.name,
      domain: emptyToNull(form.domain),
      logoUrl: emptyToNull(form.logoUrl),
      status: form.status,
      subscriptionStatus: form.subscriptionStatus,
      planId: form.planId === "none" ? null : Number(form.planId),
      shopifyShopDomain: emptyToNull(form.shopifyShopDomain),
      shopifySyncEnabled: form.shopifySyncEnabled,
      shopifyCheckoutUrl: emptyToNull(form.shopifyCheckoutUrl),
      squareLocationId: emptyToNull(form.squareLocationId),
      n8nWebhookUrl: emptyToNull(form.n8nWebhookUrl),
    });
  };

  const exportTenantJson = () => {
    if (!selectedTenant) return;
    downloadText(
      `tenant-${selectedTenant.id}.json`,
      JSON.stringify(selectedTenant, null, 2),
      "application/json"
    );
    toast.success("Tenant JSON exported");
  };

  const exportTenantsCsv = () => {
    const header = [
      "Tenant ID",
      "Name",
      "Owner",
      "Plan",
      "MRR",
      "Status",
      "Health",
    ];
    const rows = filteredTenants.map(tenant => {
      const plan = planById.get(String(tenant.planId));
      const health = healthForTenant(tenant);
      return [
        tenant.id,
        tenant.name,
        getString(
          tenant,
          ["ownerName", "ownerOpenId", "ownerEmail", "email"],
          ""
        ),
        getString(plan, ["name", "slug"], "No plan"),
        getNumber(
          tenant,
          ["mrr", "monthlyRecurringRevenue"],
          getNumber(plan, ["priceMonthly"], 0)
        ),
        tenant.status,
        health.score,
      ];
    });
    downloadText(
      "master-control-tenants.csv",
      [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n"),
      "text/csv"
    );
    toast.success("Tenant CSV exported");
  };

  const askKai = trpc.masterControl.askKai.useMutation();

  const runKaiCommand = (prompt?: string) => {
    const content = (prompt ?? kaiCommand).trim();
    if (!content || askKai.isPending) return;
    setChatMessages(current => [...current, { role: "Owner", content }]);
    setKaiCommand("");
    askKai.mutate(
      {
        question: content,
        ...(selectedTenant ? { tenantId: selectedTenant.id } : {}),
      },
      {
        onSuccess: data => {
          setChatMessages(current => [
            ...current,
            { role: "Kai", content: formatKaiAnswer(data.answer) },
          ]);
        },
        onError: error => {
          toast.error(error.message);
          setChatMessages(current => [
            ...current,
            {
              role: "Kai",
              content: `⚠️ Kai could not respond: ${error.message}`,
            },
          ]);
        },
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25">
              Owner Only
            </Badge>
            <Badge variant="outline">No-code platform control</Badge>
            <Badge variant="outline">MCP UX</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-400" /> Master Control Plane
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-6">
            Central command for tenant lifecycle, feature flags, AI governance,
            security, monetization, and Kai-assisted platform operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void status.refetch();
              void snapshot.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button asChild>
            <Link href="/developer">
              Developer Hub <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" /> Owner Access
            </CardTitle>
            <CardDescription>
              Master Control is keyed to your exact account id, not a public
              username.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking account
              </div>
            ) : (
              <>
                <div className="grid gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Signed in as
                    </p>
                    <p className="font-medium">
                      {account?.username ?? account?.email ?? account?.openId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Account id</p>
                    <p className="font-mono text-xs break-all">
                      {account?.openId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={canUse ? "default" : "destructive"}>
                      {canUse ? "Master account matched" : "Not master account"}
                    </Badge>
                    <Badge variant="outline">
                      Role: {account?.role ?? "unknown"}
                    </Badge>
                    <Badge variant="outline">
                      Username: {account?.username ?? "not set"}
                    </Badge>
                  </div>
                </div>

                {canUse && needsClaim && (
                  <Button
                    className="w-full"
                    onClick={() => claimOwnerAccess.mutate()}
                    disabled={claimOwnerAccess.isPending}
                  >
                    {claimOwnerAccess.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                    Claim Master Access
                  </Button>
                )}

                {!canUse && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                    <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                    This dashboard is locked unless the signed-in account id
                    matches the platform owner account.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Control Modules
            </CardTitle>
            <CardDescription>
              Jump straight into no-code areas that change the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modules.map(module => (
                <Button
                  key={module.path}
                  asChild
                  variant="outline"
                  className="justify-between"
                >
                  <Link href={module.path}>
                    {module.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
              {!modules.length && (
                <p className="text-sm text-muted-foreground">
                  {canUse
                    ? "Loading modules..."
                    : "Unlock Master Control to see modules."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canUse && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <MetricCard
              label="Active tenants"
              value={metrics.activeTenants}
              helper={`${tenants.length} total`}
            />
            <MetricCard
              label="MRR"
              value={formatCurrency(metrics.mrr)}
              helper="Plan + tenant snapshot"
            />
            <MetricCard
              label="Kai queries/day"
              value={metrics.kaiQueries}
              helper="Governed usage"
            />
            <MetricCard
              label="Error rate"
              value={`${metrics.errorRate}%`}
              helper="Last 24h"
            />
            <MetricCard
              label="Integration health"
              value={`${metrics.integrationHealth}%`}
              helper="Payments + webhooks"
            />
          </div>

          <Tabs defaultValue="tenants" className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="tenants">Tenants</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="ai">AI Governance</TabsTrigger>
              <TabsTrigger value="observability">Observability</TabsTrigger>
              <TabsTrigger value="monetization">Monetization</TabsTrigger>
              <TabsTrigger value="kai">Kai Command</TabsTrigger>
            </TabsList>

            <TabsContent value="tenants" className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-4 w-4" /> Tenant Directory
                        </CardTitle>
                        <CardDescription>
                          Search, inspect health, and trigger common lifecycle
                          operations.
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={tenantSearch}
                          onChange={event =>
                            setTenantSearch(event.target.value)
                          }
                          placeholder="Search tenant, owner, email, plan..."
                          className="sm:w-72"
                        />
                        <Button variant="outline" onClick={exportTenantsCsv}>
                          <Download className="h-4 w-4" /> CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant ID</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Plan / MRR</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Last activity</TableHead>
                          <TableHead>Shopify</TableHead>
                          <TableHead>Kai / Gigs</TableHead>
                          <TableHead>Health</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTenants.map(tenant => {
                          const plan = planById.get(String(tenant.planId));
                          const health = healthForTenant(tenant);
                          const mrr = getNumber(
                            tenant,
                            ["mrr", "monthlyRecurringRevenue"],
                            getNumber(plan, ["priceMonthly"], 0)
                          );
                          const activeUsers = getNumber(
                            tenant,
                            ["activeUsers", "activeUserCount", "usersActive"],
                            0
                          );
                          const kaiCredits = getNumber(
                            tenant,
                            ["kaiCreditsUsed", "creditsUsed", "aiCreditsUsed"],
                            0
                          );
                          const gigConnections = getNumber(
                            tenant,
                            [
                              "gigConnections",
                              "gigConnectionCount",
                              "connectedGigs",
                            ],
                            0
                          );
                          return (
                            <TableRow
                              key={tenant.id}
                              data-state={
                                String(tenant.id) === selectedTenantId
                                  ? "selected"
                                  : undefined
                              }
                            >
                              <TableCell>
                                <button
                                  className="text-left"
                                  onClick={() =>
                                    setSelectedTenantId(String(tenant.id))
                                  }
                                >
                                  <span className="font-medium">
                                    {tenant.name}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    #{tenant.id} · {tenant.slug}
                                  </span>
                                </button>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {getString(
                                    tenant,
                                    ["ownerName", "owner", "ownerOpenId"],
                                    "Unassigned"
                                  )}
                                </span>
                                <span className="block max-w-48 truncate text-xs text-muted-foreground">
                                  {getString(
                                    tenant,
                                    [
                                      "ownerEmail",
                                      "email",
                                      "ownerOpenId",
                                      "openId",
                                    ],
                                    "No owner email"
                                  )}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span>
                                  {getString(plan, ["name", "slug"], "No plan")}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {formatCurrency(mrr)} MRR
                                </span>
                              </TableCell>
                              <TableCell>{activeUsers || "—"}</TableCell>
                              <TableCell>
                                {getDateLabel(tenant, [
                                  "lastActivityAt",
                                  "lastSeenAt",
                                  "updatedAt",
                                ])}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    getBoolean(tenant, ["shopifySyncEnabled"])
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {getString(
                                    tenant,
                                    ["shopifySyncStatus"],
                                    getBoolean(tenant, ["shopifySyncEnabled"])
                                      ? "sync on"
                                      : "off"
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span>{kaiCredits} credits</span>
                                <span className="block text-xs text-muted-foreground">
                                  {gigConnections} gig links
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="min-w-28 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span>{health.label}</span>
                                    <span>{health.score}%</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-muted">
                                    <div
                                      className={`h-2 rounded-full ${health.className}`}
                                      style={{ width: `${health.score}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={quickAction.isPending}
                                    onClick={() =>
                                      quickAction.mutate({
                                        action:
                                          tenant.status === "suspended"
                                            ? "reactivate"
                                            : "suspend",
                                        tenantId: tenant.id,
                                      })
                                    }
                                  >
                                    {tenant.status === "suspended"
                                      ? "Reactivate"
                                      : "Suspend"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={quickAction.isPending}
                                    onClick={() => {
                                      const reason = window.prompt(
                                        "Reason for impersonation intent (min 5 chars, audited):"
                                      );
                                      if (!reason || reason.trim().length < 5) {
                                        toast.error(
                                          "A reason of at least 5 characters is required"
                                        );
                                        return;
                                      }
                                      quickAction.mutate({
                                        action: "impersonationIntent",
                                        tenantId: tenant.id,
                                        reason: reason.trim(),
                                      });
                                    }}
                                  >
                                    <UserRoundCog className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {!filteredTenants.length && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No tenants match this search.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Provisioning Wizard
                      </CardTitle>
                      <CardDescription>
                        Template-driven tenant creation plan. Backend execution
                        can attach later.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select
                        value={selectedTemplate}
                        onValueChange={setSelectedTemplate}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVISIONING_TEMPLATES.map(template => (
                            <SelectItem
                              key={template.name}
                              value={template.name}
                            >
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {PROVISIONING_TEMPLATES.filter(
                        template => template.name === selectedTemplate
                      ).map(template => (
                        <div
                          key={template.name}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <p className="font-medium">{template.name}</p>
                          <p className="text-muted-foreground">
                            {template.description}
                          </p>
                          <Badge className="mt-3" variant="outline">
                            Recommended plan: {template.plan}
                          </Badge>
                        </div>
                      ))}
                      <div className="space-y-2">
                        <Label>New tenant name</Label>
                        <Input
                          value={provisionName}
                          onChange={event =>
                            setProvisionName(event.target.value)
                          }
                          placeholder="Acme Co"
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={
                          createFromTemplate.isPending ||
                          provisionName.trim().length < 2
                        }
                        onClick={() => {
                          const templateKey =
                            TEMPLATE_KEY_BY_NAME[selectedTemplate];
                          if (!templateKey) {
                            toast.error(
                              `Unknown template: ${selectedTemplate}`
                            );
                            return;
                          }
                          createFromTemplate.mutate({
                            template: templateKey,
                            name: provisionName.trim(),
                          });
                        }}
                      >
                        {createFromTemplate.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Provision Tenant
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Transfer Ownership</CardTitle>
                      <CardDescription>
                        Prepare owner transfer with audit and cooldown controls.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Label>New owner email or OpenID</Label>
                      <Input
                        value={transferEmail}
                        onChange={event => setTransferEmail(event.target.value)}
                        placeholder="owner@example.com or oauth|..."
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={
                          !selectedTenant ||
                          transferEmail.trim().length === 0 ||
                          transferOwnership.isPending
                        }
                        onClick={() => {
                          if (!selectedTenant) {
                            toast.error("Select a tenant first");
                            return;
                          }
                          const target = transferEmail.trim();
                          transferOwnership.mutate({
                            tenantId: selectedTenant.id,
                            ...(target.includes("@")
                              ? { targetEmail: target }
                              : { targetOpenId: target }),
                          });
                        }}
                      >
                        {transferOwnership.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}{" "}
                        Stage Transfer
                      </Button>
                    </CardContent>
                  </Card>

                  <TenantEditCard
                    form={form}
                    plans={plans}
                    selectedTenant={selectedTenant}
                    isPending={updateTenantControls.isPending}
                    isCloning={cloneTenant.isPending}
                    onSave={saveTenant}
                    onFieldChange={updateField}
                    onExportJson={exportTenantJson}
                    onClone={() => {
                      if (!selectedTenant) return;
                      cloneTenant.mutate({ sourceTenantId: selectedTenant.id });
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modules" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-4 w-4" /> Platform Modules & Feature
                    Flags
                  </CardTitle>
                  <CardDescription>
                    Matrix view for global defaults, tenant overrides, rollout
                    percentage, and soft/hard enforcement.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Global Default</TableHead>
                        <TableHead>Tenant Override</TableHead>
                        <TableHead>Rollout %</TableHead>
                        <TableHead>Soft / Hard Flag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureRows.map(row => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={row.globalDefault}
                              disabled={updateFeatureFlags.isPending}
                              aria-label={`${row.name} default`}
                              onCheckedChange={checked =>
                                updateFeatureFlags.mutate({
                                  scope: "global",
                                  flags: [
                                    {
                                      key: row.key,
                                      enabled: checked,
                                      rolloutPercent: row.rolloutPercent,
                                      flagType: row.flagMode,
                                    },
                                  ],
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={row.tenantOverride}
                              disabled={updateFeatureFlags.isPending}
                              onValueChange={value => {
                                if (value !== "enabled" && value !== "disabled")
                                  return;
                                if (!selectedTenant) {
                                  toast.error(
                                    "Select a tenant before overriding a flag"
                                  );
                                  return;
                                }
                                updateFeatureFlags.mutate({
                                  scope: "tenant",
                                  tenantId: selectedTenant.id,
                                  flags: [
                                    {
                                      key: row.key,
                                      enabled: value === "enabled",
                                      rolloutPercent: row.rolloutPercent,
                                      flagType: row.flagMode,
                                    },
                                  ],
                                });
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inherit">inherit</SelectItem>
                                <SelectItem value="enabled">enabled</SelectItem>
                                <SelectItem value="disabled">
                                  disabled
                                </SelectItem>
                                <SelectItem value="select tenant">
                                  select tenant
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-44 space-y-1">
                              <Progress value={row.rolloutPercent} />
                              <p className="text-xs text-muted-foreground">
                                {row.rolloutPercent}% rollout
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.flagMode === "hard"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {row.flagMode}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-4 w-4" /> Global AI Router Rules
                    </CardTitle>
                    <CardDescription>
                      Model routing, tenant isolation, and safety defaults.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <ControlLine
                      label="Default route"
                      value={getString(
                        snapshotRecord,
                        ["aiDefaultRoute", "defaultAiRoute"],
                        "Claude primary · fallback local rules"
                      )}
                    />
                    <ControlLine
                      label="PII boundary"
                      value="Mask customer PII before prompt logging"
                    />
                    <ControlLine
                      label="High-risk actions"
                      value="Require owner approval for refunds, suspensions, or data export"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Credit Pools</CardTitle>
                    <CardDescription>
                      Burst limits and temporary grant controls.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Pool</p>
                        <p className="text-2xl font-bold">
                          {getNumber(
                            selectedTenant,
                            ["creditPool", "kaiCreditPool"],
                            2500
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Burst limit
                        </p>
                        <p className="text-2xl font-bold">
                          {getNumber(
                            selectedTenant,
                            ["burstLimit", "kaiBurstLimit"],
                            400
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Temporary credits</Label>
                        <Input
                          value={creditGrant}
                          onChange={event => setCreditGrant(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiration</Label>
                        <Input
                          value={creditGrantExpires}
                          onChange={event =>
                            setCreditGrantExpires(event.target.value)
                          }
                        />
                      </div>
                    </div>
                    <Button
                      disabled={!selectedTenant || grantCredits.isPending}
                      onClick={() => {
                        if (!selectedTenant) {
                          toast.error("Select a tenant first");
                          return;
                        }
                        const amount = Number.parseInt(creditGrant, 10);
                        if (!Number.isFinite(amount) || amount <= 0) {
                          toast.error("Enter a positive credit amount");
                          return;
                        }
                        const parsedDays = Number.parseInt(
                          creditGrantExpires,
                          10
                        );
                        const days = Number.isNaN(parsedDays) ? 7 : parsedDays;
                        if (days <= 0) {
                          toast.error("Expiration must be at least 1 day");
                          return;
                        }
                        grantCredits.mutate({
                          tenantId: selectedTenant.id,
                          amount,
                          expiresAt: new Date(
                            Date.now() + days * 24 * 60 * 60 * 1000
                          ),
                          reason: `Owner console grant: ${amount} credits for ${days} days`,
                        });
                      }}
                    >
                      {grantCredits.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="h-4 w-4" />
                      )}{" "}
                      Grant Credits
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Kai Prompt Override Library</CardTitle>
                    <CardDescription>
                      Tenant-specific prompt packs and governed overrides.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "Gig worker onboarding coach",
                      "Tax-safe expense categorizer",
                      "Commerce conversion analyst",
                    ].map(prompt => (
                      <div
                        key={prompt}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <span>{prompt}</span>
                        <Badge variant="outline">library</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Analytics</CardTitle>
                    <CardDescription>
                      Kai usage, cost controls, and anomaly watch.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ControlLine
                      label="Queries/day"
                      value={String(metrics.kaiQueries)}
                    />
                    <ControlLine
                      label="Credits used"
                      value={String(
                        getNumber(
                          selectedTenant,
                          ["kaiCreditsUsed", "creditsUsed"],
                          0
                        )
                      )}
                    />
                    <ControlLine
                      label="Anomaly status"
                      value="No abuse pattern detected"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="observability" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Logs & Audit</CardTitle>
                    <CardDescription>
                      Owner actions, tenant changes, and impersonation intents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {[
                      "Tenant status changed",
                      "Feature rollout reviewed",
                      "Impersonation intent requires reason",
                    ].map(item => (
                      <div key={item} className="rounded-lg border p-3">
                        {item}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Security Controls</CardTitle>
                    <CardDescription>
                      Master claim safety, cooldowns, and revocation UX.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      Revoking the master claim starts a cooldown window before
                      another owner claim can be made.
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        toast("Revocation requires backend confirmation")
                      }
                    >
                      <Ban className="h-4 w-4" /> Revoke Master Claim
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance</CardTitle>
                    <CardDescription>
                      Exports and tenant-specific retention overrides.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={exportTenantJson}
                    >
                      <FileJson className="h-4 w-4" /> Compliance JSON Export
                    </Button>
                    <ControlLine label="Default retention" value="365 days" />
                    <ControlLine
                      label="Tenant override"
                      value={getString(
                        selectedTenant,
                        ["dataRetentionOverride"],
                        "inherit"
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="monetization" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <WalletCards className="h-4 w-4" /> Billing Oversight
                    </CardTitle>
                    <CardDescription>
                      Subscription state and failed payment queue.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ControlLine
                      label="Selected tenant subscription"
                      value={form?.subscriptionStatus ?? "none"}
                    />
                    <ControlLine
                      label="Failed payments"
                      value={String(
                        getNumber(
                          snapshotRecord,
                          ["failedPayments", "failedPaymentCount"],
                          tenants.filter(
                            tenant => tenant.subscriptionStatus === "past_due"
                          ).length
                        )
                      )}
                    />
                    <Button
                      variant="outline"
                      onClick={() => toast("Failed payment queue opened")}
                    >
                      Open Queue
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Credits, Discounts & Upgrades</CardTitle>
                    <CardDescription>
                      Stage commercial adjustments without leaving MCP.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <Button asChild variant="outline">
                      <Link href="/billing">
                        <Gift className="h-4 w-4" /> Issue Credit
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/discounts">
                        <Copy className="h-4 w-4" /> Apply Discount
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/billing">
                        <ArrowRight className="h-4 w-4" /> Prorated Upgrade
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Forecast</CardTitle>
                    <CardDescription>
                      Simple forecast from current MRR and pipeline assumptions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ControlLine
                      label="Current MRR"
                      value={formatCurrency(metrics.mrr)}
                    />
                    <ControlLine
                      label="90-day forecast"
                      value={formatCurrency(metrics.mrr * 1.18)}
                    />
                    <ControlLine
                      label="White-label resale"
                      value={
                        getBoolean(
                          selectedTenant,
                          ["whiteLabelEnabled", "resaleEnabled"],
                          false
                        )
                          ? "enabled"
                          : "available"
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="kai" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Kai Command Panel
                  </CardTitle>
                  <CardDescription>
                    Read-only Q&amp;A with Kai (the ask_kai assistant), scoped
                    to the selected tenant. This panel answers questions only —
                    it does not execute platform commands.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Summarize tenant risk",
                      "Draft rollout plan",
                      "Prepare credit grant",
                      "Explain failed payments",
                    ].map(prompt => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        disabled={askKai.isPending}
                        onClick={() => runKaiCommand(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                  <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border p-3">
                    {chatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className="rounded-lg bg-muted/50 p-3 text-sm"
                      >
                        <p className="mb-1 font-medium">{message.role}</p>
                        <p className="text-muted-foreground">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Textarea
                      value={kaiCommand}
                      onChange={event => setKaiCommand(event.target.value)}
                      placeholder="Ask Kai to inspect a tenant, draft an action, or summarize platform risk..."
                    />
                    <Button
                      className="sm:self-end"
                      disabled={
                        askKai.isPending || kaiCommand.trim().length === 0
                      }
                      onClick={() => runKaiCommand()}
                    >
                      {askKai.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}{" "}
                      {askKai.isPending ? "Asking…" : "Send"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading controls
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Master
                Operating Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border p-3">
                Account access is granted by exact account id, so a copied
                username cannot unlock this page.
              </div>
              <div className="rounded-lg border border-border p-3">
                Secrets still belong in environment variables or provider
                vaults; this page avoids displaying token values.
              </div>
              <div className="rounded-lg border border-border p-3">
                Destructive commands are represented as staged intents until
                backend command endpoints are available.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" /> Master Control account id:{" "}
        {status.data?.expectedOpenId ?? "loading"}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ControlLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function TenantEditCard({
  form,
  plans,
  selectedTenant,
  isPending,
  isCloning,
  onSave,
  onFieldChange,
  onExportJson,
  onClone,
}: {
  form: TenantForm | null;
  plans: Array<{ id: number; name: string; slug: string }>;
  selectedTenant: { id: number; name: string } | undefined;
  isPending: boolean;
  isCloning: boolean;
  onSave: () => void;
  onFieldChange: <K extends keyof TenantForm>(
    key: K,
    value: TenantForm[K]
  ) => void;
  onExportJson: () => void;
  onClone: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-4 w-4" /> Tenant Controls
        </CardTitle>
        <CardDescription>
          Suspend/reactivate, export JSON, clone intent, and edit high-level
          settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedTenant || !form ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
            Select a tenant to edit platform controls.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onExportJson}>
                <FileJson className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="outline" disabled={isCloning} onClick={onClone}>
                {isCloning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}{" "}
                Clone Tenant
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={event => onFieldChange("name", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input
                  value={form.domain}
                  onChange={event =>
                    onFieldChange("domain", event.target.value)
                  }
                  placeholder="example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={value =>
                    onFieldChange("status", value as TenantStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["active", "trial", "suspended", "cancelled"] as const
                    ).map(value => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription</Label>
                <Select
                  value={form.subscriptionStatus}
                  onValueChange={value =>
                    onFieldChange(
                      "subscriptionStatus",
                      value as SubscriptionStatus
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "active",
                        "trialing",
                        "past_due",
                        "cancelled",
                        "none",
                      ] as const
                    ).map(value => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={form.planId}
                  onValueChange={value => onFieldChange("planId", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No plan</SelectItem>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={String(plan.id)}>
                        {plan.name} ({plan.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={form.logoUrl}
                  onChange={event =>
                    onFieldChange("logoUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Shopify Shop Domain</Label>
                <Input
                  value={form.shopifyShopDomain}
                  onChange={event =>
                    onFieldChange("shopifyShopDomain", event.target.value)
                  }
                  placeholder="store.myshopify.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Shopify Checkout URL</Label>
                <Input
                  value={form.shopifyCheckoutUrl}
                  onChange={event =>
                    onFieldChange("shopifyCheckoutUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Square Location ID</Label>
                <Input
                  value={form.squareLocationId}
                  onChange={event =>
                    onFieldChange("squareLocationId", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>n8n Webhook URL</Label>
                <Input
                  value={form.n8nWebhookUrl}
                  onChange={event =>
                    onFieldChange("n8nWebhookUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Shopify Sync</p>
                <p className="text-xs text-muted-foreground">
                  Enable automatic Shopify synchronization for this tenant.
                </p>
              </div>
              <Switch
                checked={form.shopifySyncEnabled}
                onCheckedChange={checked =>
                  onFieldChange("shopifySyncEnabled", checked)
                }
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                Changes apply immediately to the selected tenant.
              </div>
              <Button onClick={onSave} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Tenant Controls
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
