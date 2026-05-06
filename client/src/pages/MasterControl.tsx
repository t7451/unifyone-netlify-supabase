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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crown,
  Database,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Store,
} from "lucide-react";

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

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  const tenants = snapshot.data?.tenants ?? [];
  const plans = snapshot.data?.plans ?? [];
  const modules = snapshot.data?.modules ?? [];
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const selectedTenant = useMemo(
    () => tenants.find(tenant => String(tenant.id) === selectedTenantId),
    [selectedTenantId, tenants]
  );
  const [form, setForm] = useState<TenantForm | null>(null);

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
      logoUrl: "",
      status: selectedTenant.status,
      subscriptionStatus: selectedTenant.subscriptionStatus,
      planId: selectedTenant.planId ? String(selectedTenant.planId) : "none",
      shopifyShopDomain: selectedTenant.shopifyShopDomain ?? "",
      shopifySyncEnabled: selectedTenant.shopifySyncEnabled ?? false,
      shopifyCheckoutUrl: selectedTenant.shopifyCheckoutUrl ?? "",
      squareLocationId: selectedTenant.squareLocationId ?? "",
      n8nWebhookUrl: selectedTenant.n8nWebhookUrl ?? "",
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25">
              Owner Only
            </Badge>
            <Badge variant="outline">No-code platform control</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-400" /> Master Control
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-6">
            Central command for platform changes you should be able to make from
            the dashboard: owner access, module routing, tenant status,
            subscription state, and integration endpoints.
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
              Jump straight into the no-code areas that change the platform.
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
        <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" /> Platform Snapshot
              </CardTitle>
              <CardDescription>
                Tenants and plans currently visible to Master Control.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Tenants</p>
                  <p className="text-2xl font-bold">{tenants.length}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold">{plans.length}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select
                  value={selectedTenantId}
                  onValueChange={setSelectedTenantId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={String(tenant.id)}>
                        {tenant.name} ({tenant.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading controls
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-4 w-4" /> Tenant Controls
              </CardTitle>
              <CardDescription>
                Update high-level platform settings without touching code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedTenant || !form ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                  Select a tenant to edit platform controls.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={form.name}
                        onChange={event =>
                          updateField("name", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Input
                        value={form.domain}
                        onChange={event =>
                          updateField("domain", event.target.value)
                        }
                        placeholder="example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={value =>
                          updateField("status", value as TenantStatus)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            [
                              "active",
                              "trial",
                              "suspended",
                              "cancelled",
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
                      <Label>Subscription</Label>
                      <Select
                        value={form.subscriptionStatus}
                        onValueChange={value =>
                          updateField(
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
                        onValueChange={value => updateField("planId", value)}
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
                          updateField("logoUrl", event.target.value)
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shopify Shop Domain</Label>
                      <Input
                        value={form.shopifyShopDomain}
                        onChange={event =>
                          updateField("shopifyShopDomain", event.target.value)
                        }
                        placeholder="store.myshopify.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shopify Checkout URL</Label>
                      <Input
                        value={form.shopifyCheckoutUrl}
                        onChange={event =>
                          updateField("shopifyCheckoutUrl", event.target.value)
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Square Location ID</Label>
                      <Input
                        value={form.squareLocationId}
                        onChange={event =>
                          updateField("squareLocationId", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>n8n Webhook URL</Label>
                      <Input
                        value={form.n8nWebhookUrl}
                        onChange={event =>
                          updateField("n8nWebhookUrl", event.target.value)
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Shopify Sync</p>
                      <p className="text-xs text-muted-foreground">
                        Enable automatic Shopify synchronization for this
                        tenant.
                      </p>
                    </div>
                    <Switch
                      checked={form.shopifySyncEnabled}
                      onCheckedChange={checked =>
                        updateField("shopifySyncEnabled", checked)
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      Changes apply immediately to the selected tenant.
                    </div>
                    <Button
                      onClick={saveTenant}
                      disabled={updateTenantControls.isPending}
                    >
                      {updateTenantControls.isPending ? (
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
        </div>
      )}

      {canUse && (
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
              Secrets still belong in environment variables or provider vaults;
              this page avoids displaying token values.
            </div>
            <div className="rounded-lg border border-border p-3">
              Use Developer Hub and Authorization Hub for API keys, webhooks,
              MCP, and provider connection work.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" /> Master Control account id:{" "}
        {status.data?.expectedOpenId ?? "loading"}
      </div>
    </div>
  );
}
