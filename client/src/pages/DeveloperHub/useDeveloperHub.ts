import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type {
  RevokeTarget,
  WebhookFilterSource,
  WebhookFilterStatus,
} from "./DeveloperHub.types";

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copied, copy };
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
export function useOverviewTab() {
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

  return { health, keys, mcpHealth, mcpHealthData, stats, checks, allOk };
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────
export function useApiKeysTab() {
  const utils = trpc.useUtils();
  const keys = trpc.developer.listApiKeys.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>("never");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
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

  const toggleScope = (s: string) =>
    setNewKeyScopes(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );

  return {
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
  };
}

// ─── Webhook Logs Tab ─────────────────────────────────────────────────────────
export function useWebhooksTab() {
  const utils = trpc.useUtils();
  const [limit, setLimit] = useState(50);
  const [filterSource, setFilterSource] = useState<WebhookFilterSource>("all");
  const [filterStatus, setFilterStatus] = useState<WebhookFilterStatus>("all");
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

  return {
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
  };
}

// ─── Code Snippets Tab ────────────────────────────────────────────────────────
export function useCodeTab() {
  const snippets = trpc.developer.codeSnippets.useQuery();
  const { copied, copy } = useCopy();
  const [active, setActive] = useState<string | null>(null);

  return { snippets, copied, copy, active, setActive };
}

// ─── API Reference Tab ────────────────────────────────────────────────────────
export function useReferenceTab() {
  const ref = trpc.developer.endpointReference.useQuery();
  const [expanded, setExpanded] = useState<string | null>(null);

  return { ref, expanded, setExpanded };
}
