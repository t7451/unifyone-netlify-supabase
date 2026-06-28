import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  PLATFORM_MODULES,
  PROVISIONING_TEMPLATES,
} from "./MasterControl.constants";
import type {
  ChatMessage,
  ModuleFlag,
  TenantForm,
} from "./MasterControl.types";
import {
  csvEscape,
  downloadText,
  emptyToNull,
  formatKaiAnswer,
  getBoolean,
  getNumber,
  getString,
  healthForTenant,
  recordFrom,
  recordsFrom,
  slugify,
} from "./MasterControl.utils";

export function useMasterControl() {
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

  return {
    status,
    snapshot,
    snapshotRecord,
    claimOwnerAccess,
    updateTenantControls,
    createFromTemplate,
    cloneTenant,
    transferOwnership,
    quickAction,
    grantCredits,
    updateFeatureFlags,
    askKai,
    tenants,
    plans,
    modules,
    selectedTenantId,
    setSelectedTenantId,
    tenantSearch,
    setTenantSearch,
    selectedTemplate,
    setSelectedTemplate,
    provisionName,
    setProvisionName,
    transferEmail,
    setTransferEmail,
    creditGrant,
    setCreditGrant,
    creditGrantExpires,
    setCreditGrantExpires,
    kaiCommand,
    setKaiCommand,
    chatMessages,
    selectedTenant,
    form,
    planById,
    filteredTenants,
    featureRows,
    metrics,
    isLoading,
    account,
    canUse,
    needsClaim,
    updateField,
    saveTenant,
    exportTenantJson,
    exportTenantsCsv,
    runKaiCommand,
  };
}
