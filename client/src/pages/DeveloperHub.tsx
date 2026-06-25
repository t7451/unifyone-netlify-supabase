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

import { useState } from "react";
import { trpc } from "@/lib/trpc";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copied, copy };
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text, id)}
      className="text-gray-500 hover:text-white transition-colors"
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

function timeAgo(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "Never";
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const health = trpc.developer.health.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const keys = trpc.developer.listApiKeys.useQuery();
  const mcpHealth = trpc.mcp.health.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: 1,
  });
  const mcpHealthData = mcpHealth.data as
    | (Record<string, unknown> & { tools?: number })
    | undefined;
  const stats = trpc.developer.webhookStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const checks = health.data?.checks ?? {};
  const allOk = Object.values(checks).every(Boolean);

  return (
    <div className="space-y-6">
      {/* Platform Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D9FF]" />
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
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking services…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(checks).map(([service, ok]) => (
                <div
                  key={service}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5"
                >
                  <StatusDot ok={ok as boolean} />
                  <span className="text-sm text-gray-300 capitalize">
                    {service}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                <StatusDot ok={mcpHealth.data?.status === "ok"} />
                <span className="text-sm text-gray-300">MCP Worker</span>
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
            color: "text-[#00D9FF]",
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
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white capitalize">
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
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00D9FF]" />
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
                  <p className="text-gray-500 text-xs">{row.label}</p>
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
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Webhook className="w-4 h-4 text-[#00D9FF]" />
            Webhook Event Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.isLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading stats…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Total",
                  value: stats.data?.total ?? 0,
                  color: "text-gray-300",
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
                  className="flex flex-col items-center justify-center px-3 py-3 rounded-lg bg-white/5 border border-white/5"
                >
                  <span className={cn("text-2xl font-bold", s.color)}>
                    {s.value}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">
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
          <CardTitle className="text-base text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00D9FF]" />
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-gray-500 group-hover:text-[#00D9FF] transition-colors" />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {link.label}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
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
  const utils = trpc.useUtils();
  const keys = trpc.developer.listApiKeys.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>("never");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const { copied, copy } = useCopy();

  const generate = trpc.developer.generateApiKey.useMutation({
    onSuccess: data => {
      setCreatedKey(data.rawKey);
      setShowCreate(false);
      setNewKeyName("");
      toast.success("API key created — save it now!");
      utils.developer.listApiKeys.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const revoke = trpc.developer.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      utils.developer.listApiKeys.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const SCOPE_OPTIONS = [
    "read",
    "write",
    "orders",
    "products",
    "analytics",
    "admin",
  ];
  const EXPIRY_OPTIONS = [
    { value: "never", label: "Never" },
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
    { value: "365", label: "1 year" },
  ];

  const toggleScope = (s: string) =>
    setNewKeyScopes(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );

  return (
    <div className="space-y-6">
      {/* Revealed key dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent className="bg-[#0A1128] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#00D9FF]" />
              Your New API Key
            </DialogTitle>
            <DialogDescription className="text-amber-400">
              ⚠ This key will never be shown again. Copy it now and store it
              securely.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <code className="block w-full p-3 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-emerald-400 break-all">
              {createdKey}
            </code>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-white"
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
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent className="bg-[#0A1128] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to revoke{" "}
              <span className="text-white font-medium">
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
              className="border-white/10 text-gray-400"
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
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#00D9FF]" />
                API Keys
              </CardTitle>
              <CardDescription className="text-gray-500 text-sm mt-1">
                Optional: use API keys to authenticate programmatic access to
                your storefront add-on data.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Key
            </Button>
          </div>
        </CardHeader>

        {showCreate && (
          <CardContent className="border-t border-white/5 pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Key Name</Label>
                  <Input
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Storefront"
                    className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Expiration</Label>
                  <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50">
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
                <Label className="text-gray-300 text-sm">Scopes</Label>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleScope(s)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        newKeyScopes.includes(s)
                          ? "bg-[#00D9FF]/10 border-[#00D9FF]/30 text-[#00D9FF]"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
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
                  className="border-white/10 text-gray-400"
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
                  className="bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90 font-semibold"
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
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading keys…
            </div>
          ) : !keys.data?.length ? (
            <div className="text-center py-10">
              <Key className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No API keys yet. Create one above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.data.map(k => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className="w-4 h-4 text-[#00D9FF] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {k.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs font-mono text-gray-400">
                          {k.keyPrefix}…
                        </code>
                        <CopyButton
                          text={`${k.keyPrefix}…`}
                          id={`key-${k.id}`}
                        />
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-xs text-gray-500">
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
                        className="text-xs border-white/10 text-gray-400"
                      >
                        {s}
                      </Badge>
                    ))}
                    {(k.scopes as string[]).length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-white/10 text-gray-400"
                      >
                        +{(k.scopes as string[]).length - 3}
                      </Badge>
                    )}
                    <button
                      onClick={() =>
                        setRevokeTarget({ id: k.id, name: k.name })
                      }
                      className="text-gray-600 hover:text-red-400 transition-colors ml-1"
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

const SOURCE_COLORS: Record<string, string> = {
  stripe: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  shopify: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  n8n: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  internal: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  processed: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-gray-400",
};

function WebhooksTab() {
  const utils = trpc.useUtils();
  const [limit, setLimit] = useState(50);
  const [filterSource, setFilterSource] = useState<
    "all" | "stripe" | "shopify" | "n8n" | "internal"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "processed" | "failed" | "skipped"
  >("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const logs = trpc.developer.webhookLogs.useQuery(
    {
      limit,
      source: filterSource !== "all" ? filterSource : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      search: search.trim() || undefined,
    },
    { refetchInterval: 10_000 }
  );

  const retry = trpc.developer.retryWebhook.useMutation({
    onSuccess: () => {
      toast.success("Queued for retry");
      utils.developer.webhookLogs.invalidate();
      utils.developer.webhookStats.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#00D9FF]" />
                Webhook Event Log
              </CardTitle>
              <CardDescription className="text-gray-500 text-sm mt-1">
                Live feed of incoming webhook events from Stripe, Shopify, and
                n8n.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(limit)}
                onValueChange={v => setLimit(parseInt(v))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-28 h-8 text-xs focus:border-[#00D9FF]/50">
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
                className="text-gray-500 hover:text-white transition-colors"
              >
                <RefreshCw
                  className={cn("w-4 h-4", logs.isFetching && "animate-spin")}
                />
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
            <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <Select
              value={filterSource}
              onValueChange={v => setFilterSource(v as typeof filterSource)}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-32 h-7 text-xs focus:border-[#00D9FF]/50">
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
              onValueChange={v => setFilterStatus(v as typeof filterStatus)}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-32 h-7 text-xs focus:border-[#00D9FF]/50">
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
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search event type…"
                className="pl-6 h-7 text-xs bg-white/5 border-white/10 text-white focus:border-[#00D9FF]/50"
              />
            </div>
            {(filterSource !== "all" || filterStatus !== "all" || search) && (
              <button
                onClick={() => {
                  setFilterSource("all");
                  setFilterStatus("all");
                  setSearch("");
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.isLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm p-5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading events…
            </div>
          ) : !logs.data?.length ? (
            <div className="text-center py-10">
              <Webhook className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No webhook events match your filters.
              </p>
              <p className="text-gray-600 text-xs mt-1">
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded border shrink-0",
                          SOURCE_COLORS[evt.source] ?? "text-gray-400"
                        )}
                      >
                        {evt.source}
                      </span>
                      <span className="text-sm text-gray-300 truncate flex-1 font-mono">
                        {evt.eventType}
                      </span>
                      <span
                        className={cn(
                          "text-xs shrink-0",
                          STATUS_COLORS[evt.status] ?? "text-gray-400"
                        )}
                      >
                        {evt.status}
                      </span>
                      <span className="text-xs text-gray-600 shrink-0 w-20 text-right">
                        {timeAgo(evt.createdAt)}
                      </span>
                      {expanded === evt.id ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      )}
                    </button>
                    {expanded === evt.id && (
                      <div className="px-4 pb-3 space-y-2">
                        <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-auto max-h-48">
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
      <p className="text-gray-400 text-sm">
        Optional: the UnifyOne MCP (Model Context Protocol) server exposes your
        storefront add-on data to AI assistants like Claude. Connect it to any
        MCP-compatible tool.
      </p>
      <MCPStatusWidget variant="settings" />
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00D9FF]" />
            Using MCP Tools Programmatically
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-400">
            Invoke any MCP tool through the tRPC endpoint — useful for
            automation scripts, n8n nodes, and AI-driven workflows. The live
            Netlify MCP catalog uses snake_case names; older camelCase aliases
            only work when your bridge agent maps them.
          </p>
          <div className="rounded-lg bg-black/50 border border-white/5 p-3">
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
            className="flex items-center gap-2 text-sm text-[#00D9FF] hover:text-[#00D9FF]/80 transition-colors"
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

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  tsx: "text-blue-400",
  json: "text-amber-400",
};

function CodeTab() {
  const snippets = trpc.developer.codeSnippets.useQuery();
  const { copied, copy } = useCopy();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Optional: ready-to-use snippets for common storefront add-on
        integrations and automations. Click a snippet to expand, then copy with
        the button.
      </p>

      {snippets.isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
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
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                onClick={() =>
                  setActive(active === snippet.id ? null : snippet.id)
                }
              >
                <Code2 className="w-4 h-4 text-[#00D9FF] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    {snippet.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {snippet.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-mono shrink-0",
                    LANG_COLORS[snippet.language] ?? "text-gray-400"
                  )}
                >
                  {snippet.language}
                </span>
                {active === snippet.id ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
              </button>

              {active === snippet.id && (
                <div className="border-t border-white/5">
                  <div className="relative">
                    <ScrollArea className="h-64">
                      <pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {snippet.code}
                      </pre>
                    </ScrollArea>
                    <button
                      onClick={() => {
                        copy(snippet.code, snippet.id);
                        toast.success("Copied to clipboard");
                      }}
                      className="absolute top-2 right-3 flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors bg-black/40 px-2 py-1 rounded"
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
  const ref = trpc.developer.endpointReference.useQuery();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {ref.isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading reference…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#00D9FF]/5 border border-[#00D9FF]/15">
            <Terminal className="w-4 h-4 text-[#00D9FF] shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Base URL</p>
              <code className="text-sm text-[#00D9FF] font-mono">
                {ref.data?.baseUrl}
              </code>
            </div>
          </div>
          <p className="text-xs text-gray-500">{ref.data?.auth}</p>

          <div className="space-y-3">
            {ref.data?.namespaces.map(ns => (
              <Card
                key={ns.name}
                className="bg-card border-border overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                  onClick={() =>
                    setExpanded(expanded === ns.name ? null : ns.name)
                  }
                >
                  <Code2 className="w-4 h-4 text-[#00D9FF] shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-mono font-medium">
                      {ns.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ns.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-white/10 text-gray-500 text-xs shrink-0"
                  >
                    {ns.procedures.length} procedures
                  </Badge>
                  {expanded === ns.name ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  )}
                </button>

                {expanded === ns.name && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
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
                        <code className="text-xs font-mono text-gray-300">
                          {proc.name}
                        </code>
                        <span className="text-xs text-gray-500 ml-auto text-right">
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
            <Code2 className="w-5 h-5 text-[#00D9FF]" />
            <h1 className="text-2xl font-bold text-white">Developer Hub</h1>
            <Badge
              variant="outline"
              className="text-xs border-[#00D9FF]/30 text-[#00D9FF] ml-1"
            >
              Optional Tooling
            </Badge>
          </div>
          <p className="text-gray-400 text-sm">
            Optional, secondary tools for builders who want to integrate or
            automate the storefront add-ons. Not required to use GigIQ, Tax
            Autopilot, or the rest of the gig-earnings app.
          </p>
        </div>
        <a
          href="/architecture"
          className="shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-lg px-3 py-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Architecture
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </a>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-0.5 p-1">
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
                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-[#00D9FF]/10 data-[state=active]:text-[#00D9FF]"
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
