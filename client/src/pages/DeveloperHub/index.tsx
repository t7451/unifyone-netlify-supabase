/**
 * Developer Hub — optional, secondary tooling for builders who want to
 * integrate or automate the storefront add-ons. Not part of the core
 * gig-earnings experience.
 *
 * Tabs:
 *   Overview    — health check, stats, quick links
 *   API Keys    — generate / revoke tenant API keys
 *   Webhooks    — live webhook event log
 *   MCP Tools   — MCP server status + tool browser
 *   Code        — ready-to-copy integration snippets
 *   Reference   — tRPC endpoint reference
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Code2,
  Key,
  Activity,
  Webhook,
  Cpu,
  Copy,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Zap,
  Terminal,
  Globe,
  Database,
  ShoppingBag,
  Link2,
  Loader2,
  RotateCcw,
  Search,
  Filter,
} from "lucide-react";
import MCPStatusWidget from "@/components/MCPStatusWidget";
import { cn } from "@/lib/utils";
import {
  EXPIRY_OPTIONS,
  LANG_COLORS,
  SCOPE_OPTIONS,
  SOURCE_COLORS,
  STATUS_COLORS,
} from "./DeveloperHub.constants";
import { timeAgo } from "./DeveloperHub.utils";
import {
  useApiKeysTab,
  useCodeTab,
  useCopy,
  useOverviewTab,
  useReferenceTab,
  useWebhooksTab,
} from "./useDeveloperHub";
import type {
  WebhookFilterSource,
  WebhookFilterStatus,
} from "./DeveloperHub.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text, id }: { text: string; id: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text, id)}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied === id ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        ok ? "bg-emerald-400" : "bg-red-400"
      )}
    />
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { health, keys, mcpHealth, mcpHealthData, stats, checks, allOk } =
    useOverviewTab();

  return (
    <div className="space-y-6">
      {/* Platform Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Platform Status
            </CardTitle>
            <Badge
              className={cn(
                "text-xs font-semibold",
                allOk
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}
              variant="outline"
            >
              {health.isLoading
                ? "Checking…"
                : allOk
                  ? "All Systems Operational"
                  : "Partial Degradation"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {health.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking services…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(checks).map(([service, ok]) => (
                <div
                  key={service}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border"
                >
                  <StatusDot ok={ok as boolean} />
                  <span className="text-sm text-muted-foreground capitalize">
                    {service}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                <StatusDot ok={mcpHealth.data?.status === "ok"} />
                <span className="text-sm text-muted-foreground">
                  MCP Worker
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Active API Keys",
            value: keys.isLoading ? "…" : String(keys.data?.length ?? 0),
            icon: Key,
            color: "text-primary",
          },
          {
            label: "Tenant Status",
            value: health.data?.tenant?.status ?? "—",
            icon: Database,
            color: "text-emerald-400",
          },
          {
            label: "Subscription",
            value: health.data?.tenant?.subscriptionStatus ?? "—",
            icon: Zap,
            color: "text-amber-400",
          },
          {
            label: "MCP Tools",
            value:
              mcpHealthData?.tools != null ? String(mcpHealthData.tools) : "—",
            icon: Cpu,
            color: "text-violet-400",
          },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", stat.color)} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground capitalize">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tenant Info */}
      {health.data?.tenant && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Tenant Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                { label: "ID", value: String(health.data.tenant.id) },
                { label: "Name", value: health.data.tenant.name },
                { label: "Slug", value: health.data.tenant.slug },
              ].map(row => (
                <div key={row.label} className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">{row.label}</p>
                  <p className="text-gray-200 font-mono">{row.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            Webhook Event Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading stats…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Total",
                  value: stats.data?.total ?? 0,
                  color: "text-muted-foreground",
                },
                {
                  label: "Processed",
                  value: stats.data?.processed ?? 0,
                  color: "text-emerald-400",
                },
                {
                  label: "Pending",
                  value: stats.data?.pending ?? 0,
                  color: "text-amber-400",
                },
                {
                  label: "Failed",
                  value: stats.data?.failed ?? 0,
                  color: "text-red-400",
                },
              ].map(s => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center px-3 py-3 rounded-lg bg-muted/40 border border-border"
                >
                  <span className={cn("text-2xl font-bold", s.color)}>
                    {s.value}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Developer Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "Integration Guides",
                href: "/documents/integrations",
                icon: Link2,
              },
              {
                label: "Architecture Overview",
                href: "/architecture",
                icon: Database,
              },
              { label: "Docs Chat (AI)", href: "/docs-chat", icon: Terminal },
              { label: "Sync Monitor", href: "/sync-monitor", icon: Activity },
              { label: "Automations (n8n)", href: "/automations", icon: Zap },
              { label: "Theme Store", href: "/themes", icon: ShoppingBag },
            ].map(link => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/40 hover:border-border transition-colors group"
                >
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {link.label}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-muted-foreground transition-colors" />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const {
    keys,
    showCreate,
    setShowCreate,
    newKeyName,
    setNewKeyName,
    newKeyScopes,
    newKeyExpiry,
    setNewKeyExpiry,
    createdKey,
    setCreatedKey,
    revokeTarget,
    setRevokeTarget,
    copied,
    copy,
    generate,
    revoke,
    toggleScope,
  } = useApiKeysTab();

  return (
    <div className="space-y-6">
      {/* Revealed key dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              Your New API Key
            </DialogTitle>
            <DialogDescription className="text-amber-400">
              ⚠ This key will never be shown again. Copy it now and store it
              securely.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <code className="block w-full p-3 rounded-lg bg-black/50 border border-border text-xs font-mono text-emerald-400 break-all">
              {createdKey}
            </code>
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              onClick={() => copy(createdKey!, "revealed")}
            >
              {copied === "revealed" ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                copy(createdKey!, "revealed");
                toast.success("Copied!");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to revoke{" "}
              <span className="text-foreground font-medium">
                "{revokeTarget?.name}"
              </span>
              ? Any applications using this key will lose access immediately.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              className="border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (revokeTarget) {
                  revoke.mutate({ id: revokeTarget.id });
                  setRevokeTarget(null);
                }
              }}
              disabled={revoke.isPending}
              className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              {revoke.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking…
                </>
              ) : (
                <>Revoke Key</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create key form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                API Keys
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Optional: use API keys to authenticate programmatic access to
                your storefront add-on data.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Key
            </Button>
          </div>
        </CardHeader>

        {showCreate && (
          <CardContent className="border-t border-border pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-sm">
                    Key Name
                  </Label>
                  <Input
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Storefront"
                    className="bg-muted/40 border-border text-foreground focus:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-sm">
                    Expiration
                  </Label>
                  <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                    <SelectTrigger className="bg-muted/40 border-border text-foreground focus:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">Scopes</Label>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleScope(s)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        newKeyScopes.includes(s)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  className="border-border text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newKeyName.trim() || generate.isPending}
                  onClick={() =>
                    generate.mutate({
                      name: newKeyName.trim(),
                      scopes: newKeyScopes.length ? newKeyScopes : ["read"],
                      expiresInDays:
                        newKeyExpiry !== "never"
                          ? parseInt(newKeyExpiry)
                          : undefined,
                    })
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Generating…
                    </>
                  ) : (
                    <>Generate Key</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Key list */}
      <Card className="bg-card border-border">
        <CardContent className="pt-5">
          {keys.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading keys…
            </div>
          ) : !keys.data?.length ? (
            <div className="text-center py-10">
              <Key className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No API keys yet. Create one above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.data.map(k => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">
                        {k.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs font-mono text-muted-foreground">
                          {k.keyPrefix}…
                        </code>
                        <CopyButton
                          text={`${k.keyPrefix}…`}
                          id={`key-${k.id}`}
                        />
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">
                          Last used: {timeAgo(k.lastUsedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(k.scopes as string[]).slice(0, 3).map(s => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        {s}
                      </Badge>
                    ))}
                    {(k.scopes as string[]).length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        +{(k.scopes as string[]).length - 3}
                      </Badge>
                    )}
                    <button
                      onClick={() =>
                        setRevokeTarget({ id: k.id, name: k.name })
                      }
                      className="text-muted-foreground hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security note */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-300/80">
              <p className="font-medium text-amber-300 mb-1">
                Security Best Practices
              </p>
              <ul className="space-y-0.5 text-xs text-amber-300/70 list-disc list-inside">
                <li>
                  Never embed API keys in client-side code or public
                  repositories
                </li>
                <li>
                  Rotate keys regularly and use the minimum scopes required
                </li>
                <li>
                  Set expiration dates on all keys used in automated systems
                </li>
                <li>Revoke keys immediately if they may be compromised</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Webhook Logs Tab ─────────────────────────────────────────────────────────

function WebhooksTab() {
  const {
    limit,
    setLimit,
    filterSource,
    setFilterSource,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    expanded,
    setExpanded,
    logs,
    retry,
  } = useWebhooksTab();

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Webhook className="w-4 h-4 text-primary" />
                Webhook Event Log
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Live feed of incoming webhook events from Stripe, Shopify, and
                n8n.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(limit)}
                onValueChange={v => setLimit(parseInt(v))}
              >
                <SelectTrigger className="bg-muted/40 border-border text-foreground w-28 h-8 text-xs focus:border-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} events
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => logs.refetch()}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw
                  className={cn("w-4 h-4", logs.isFetching && "animate-spin")}
                />
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select
              value={filterSource}
              onValueChange={v => setFilterSource(v as WebhookFilterSource)}
            >
              <SelectTrigger className="bg-muted/40 border-border text-foreground w-32 h-7 text-xs focus:border-primary/50">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="shopify">Shopify</SelectItem>
                <SelectItem value="n8n">n8n</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={v => setFilterStatus(v as WebhookFilterStatus)}
            >
              <SelectTrigger className="bg-muted/40 border-border text-foreground w-32 h-7 text-xs focus:border-primary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search event type…"
                className="pl-6 h-7 text-xs bg-muted/40 border-border text-foreground focus:border-primary/50"
              />
            </div>
            {(filterSource !== "all" || filterStatus !== "all" || search) && (
              <button
                onClick={() => {
                  setFilterSource("all");
                  setFilterStatus("all");
                  setSearch("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm p-5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading events…
            </div>
          ) : !logs.data?.length ? (
            <div className="text-center py-10">
              <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No webhook events match your filters.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Configure Shopify, Stripe, or n8n to see events here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-white/5">
                {logs.data.map(evt => (
                  <div key={evt.id} className="group">
                    <button
                      onClick={() =>
                        setExpanded(expanded === evt.id ? null : evt.id)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded border shrink-0",
                          SOURCE_COLORS[evt.source] ?? "text-muted-foreground"
                        )}
                      >
                        {evt.source}
                      </span>
                      <span className="text-sm text-muted-foreground truncate flex-1 font-mono">
                        {evt.eventType}
                      </span>
                      <span
                        className={cn(
                          "text-xs shrink-0",
                          STATUS_COLORS[evt.status] ?? "text-muted-foreground"
                        )}
                      >
                        {evt.status}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                        {timeAgo(evt.createdAt)}
                      </span>
                      {expanded === evt.id ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expanded === evt.id && (
                      <div className="px-4 pb-3 space-y-2">
                        <pre className="bg-black/40 border border-border rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-48">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                        {evt.error && (
                          <p className="text-xs text-red-400 font-mono">
                            {evt.error}
                          </p>
                        )}
                        {evt.status === "failed" && (
                          <button
                            disabled={retry.isPending}
                            onClick={() => retry.mutate({ id: evt.id })}
                            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw
                              className={cn(
                                "w-3 h-3",
                                retry.isPending && "animate-spin"
                              )}
                            />
                            Retry this event
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MCP Tools Tab ────────────────────────────────────────────────────────────

function MCPToolsTab() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Optional: the UnifyOne MCP (Model Context Protocol) server exposes your
        storefront add-on data to AI assistants like Claude. Connect it to any
        MCP-compatible tool.
      </p>
      <MCPStatusWidget variant="settings" />
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            Using MCP Tools Programmatically
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Invoke any MCP tool through the tRPC endpoint — useful for
            automation scripts, n8n nodes, and AI-driven workflows. The live
            Netlify MCP catalog uses snake_case names; older camelCase aliases
            only work when your bridge agent maps them.
          </p>
          <div className="rounded-lg bg-black/50 border border-border p-3">
            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
              {`// Via tRPC (authenticated)
const result = await trpc.mcp.callTool.mutate({
  tool: "get_analytics_summary",
  args: { days: 30 },
});

// Preferred tool names are snake_case:
//   get_analytics_summary  — revenue + order stats
//   get_low_stock_products — inventory alerts
//   list_products          — full product catalog
//   list_orders            — recent orders
//   list_customers         — customer list
//   get_webhook_events     — integration event log
//   ask_kai                — AI commerce assistant
//   list_deals             — DealFlow affiliate catalog
//   query_graph            — knowledge graph search
//
// Legacy aliases such as getAnalyticsSummary may still work when
// your MCP bridge agent explicitly implements camelCase mapping.`}
            </pre>
          </div>
          <a
            href="/ai-assistant"
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Open AI Assistant to chat with your data →
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Code Snippets Tab ────────────────────────────────────────────────────────

function CodeTab() {
  const { snippets, copied, copy, active, setActive } = useCodeTab();

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Optional: ready-to-use snippets for common storefront add-on
        integrations and automations. Click a snippet to expand, then copy with
        the button.
      </p>

      {snippets.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading snippets…
        </div>
      ) : (
        <div className="space-y-3">
          {snippets.data?.map(snippet => (
            <Card
              key={snippet.id}
              className="bg-card border-border overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                onClick={() =>
                  setActive(active === snippet.id ? null : snippet.id)
                }
              >
                <Code2 className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">
                    {snippet.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {snippet.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-mono shrink-0",
                    LANG_COLORS[snippet.language] ?? "text-muted-foreground"
                  )}
                >
                  {snippet.language}
                </span>
                {active === snippet.id ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>

              {active === snippet.id && (
                <div className="border-t border-border">
                  <div className="relative">
                    <ScrollArea className="h-64">
                      <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snippet.code}
                      </pre>
                    </ScrollArea>
                    <button
                      onClick={() => {
                        copy(snippet.code, snippet.id);
                        toast.success("Copied to clipboard");
                      }}
                      className="absolute top-2 right-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-black/40 px-2 py-1 rounded"
                    >
                      {copied === snippet.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── API Reference Tab ────────────────────────────────────────────────────────

function ReferenceTab() {
  const { ref, expanded, setExpanded } = useReferenceTab();

  return (
    <div className="space-y-4">
      {ref.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading reference…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
            <Terminal className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Base URL</p>
              <code className="text-sm text-primary font-mono">
                {ref.data?.baseUrl}
              </code>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{ref.data?.auth}</p>

          <div className="space-y-3">
            {ref.data?.namespaces.map(ns => (
              <Card
                key={ns.name}
                className="bg-card border-border overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() =>
                    setExpanded(expanded === ns.name ? null : ns.name)
                  }
                >
                  <Code2 className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-mono font-medium">
                      {ns.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ns.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground text-xs shrink-0"
                  >
                    {ns.procedures.length} procedures
                  </Badge>
                  {expanded === ns.name ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {expanded === ns.name && (
                  <div className="border-t border-border divide-y divide-white/5">
                    {ns.procedures.map(proc => (
                      <div
                        key={proc.name}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs shrink-0",
                            proc.type === "query"
                              ? "border-blue-500/30 text-blue-400"
                              : "border-amber-500/30 text-amber-400"
                          )}
                        >
                          {proc.type}
                        </Badge>
                        <code className="text-xs font-mono text-muted-foreground">
                          {proc.name}
                        </code>
                        <span className="text-xs text-muted-foreground ml-auto text-right">
                          {proc.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeveloperHub() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Developer Hub
            </h1>
            <Badge
              variant="outline"
              className="text-xs border-primary/30 text-primary ml-1"
            >
              Optional Tooling
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Optional, secondary tools for builders who want to integrate or
            automate the storefront add-ons. Not required to use GigIQ, Tax
            Autopilot, or the rest of the gig-earnings app.
          </p>
        </div>
        <a
          href="/architecture"
          className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-border rounded-lg px-3 py-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Architecture
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </a>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/40 border border-border flex-wrap h-auto gap-0.5 p-1">
          {[
            { value: "overview", label: "Overview", icon: Activity },
            { value: "apikeys", label: "API Keys", icon: Key },
            { value: "webhooks", label: "Webhooks", icon: Webhook },
            { value: "mcp", label: "MCP Tools", icon: Cpu },
            { value: "code", label: "Code Snippets", icon: Code2 },
            { value: "reference", label: "API Reference", icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="apikeys" className="mt-6">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-6">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="mcp" className="mt-6">
          <MCPToolsTab />
        </TabsContent>
        <TabsContent value="code" className="mt-6">
          <CodeTab />
        </TabsContent>
        <TabsContent value="reference" className="mt-6">
          <ReferenceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
