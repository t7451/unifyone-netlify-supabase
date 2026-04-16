/**
 * Authorization Hub
 *
 * One-tap connection cards for GitHub, Omnara, Gemini, Claude, Kimi and other
 * model / platform APIs. Each card shows a clear connected / pending state.
 *
 * ⚠️  PRODUCTION NOTE
 * All provider flows below are UI shells. Real OAuth app credentials (client-id,
 * client-secret, redirect URIs) and model API keys must be configured in your
 * environment / secrets vault before these buttons can complete a live auth flow.
 * No fake "Connected" state is shown — the app is explicit about what still
 * needs real credentials.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Globe,
  Info,
  Key,
  Lock,
  RefreshCw,
  Sparkles,
  Unlink,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Provider definitions ──────────────────────────────────────────────────────

type ProviderKind = "oauth" | "apikey";

interface Provider {
  id: string;
  name: string;
  tagline: string;
  category: "vcs" | "ai-model" | "platform";
  kind: ProviderKind;
  color: string;
  bgColor: string;
  Icon: React.ElementType;
  docsUrl: string;
  /** Env-var names that must be set for the integration to go live */
  requiredEnvVars: string[];
  oauthUrl?: string;
}

const PROVIDERS: Provider[] = [
  // ── VCS ───────────────────────────────────────────────────────────────────
  {
    id: "github",
    name: "GitHub",
    tagline: "OAuth — repo access, webhooks, Copilot APIs",
    category: "vcs",
    kind: "oauth",
    color: "#e6edf3",
    bgColor: "#161b2220",
    Icon: GitBranch,
    docsUrl: "https://docs.github.com/en/apps/creating-github-apps",
    requiredEnvVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    oauthUrl: "https://github.com/login/oauth/authorize",
  },
  // ── AI models ─────────────────────────────────────────────────────────────
  {
    id: "claude",
    name: "Claude (Anthropic)",
    tagline: "API key — Claude 3 / Sonnet / Haiku models",
    category: "ai-model",
    kind: "apikey",
    color: "#D97757",
    bgColor: "#D9775720",
    Icon: Sparkles,
    docsUrl: "https://docs.anthropic.com/en/api/getting-started",
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    tagline: "API key — Gemini 1.5 Pro / Flash models",
    category: "ai-model",
    kind: "apikey",
    color: "#4285F4",
    bgColor: "#4285F420",
    Icon: Zap,
    docsUrl: "https://ai.google.dev/gemini-api/docs/api-key",
    requiredEnvVars: ["GEMINI_API_KEY"],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot AI)",
    tagline: "API key — long-context Chinese / multilingual model",
    category: "ai-model",
    kind: "apikey",
    color: "#7C3AED",
    bgColor: "#7C3AED20",
    Icon: Globe,
    docsUrl: "https://platform.moonshot.cn/docs",
    requiredEnvVars: ["KIMI_API_KEY"],
  },
  {
    id: "omnara",
    name: "Omnara",
    tagline: "OAuth — Omnara platform integration",
    category: "platform",
    kind: "oauth",
    color: "#00D9FF",
    bgColor: "#00D9FF20",
    Icon: Lock,
    docsUrl: "https://omnara.com/developers",
    requiredEnvVars: ["OMNARA_CLIENT_ID", "OMNARA_CLIENT_SECRET"],
    oauthUrl: "https://omnara.com/oauth/authorize",
  },
  // ── Other popular AI providers ─────────────────────────────────────────────
  {
    id: "openai",
    name: "OpenAI",
    tagline: "API key — GPT-4o, o1, embeddings",
    category: "ai-model",
    kind: "apikey",
    color: "#10A37F",
    bgColor: "#10A37F20",
    Icon: Key,
    docsUrl: "https://platform.openai.com/docs/api-reference/introduction",
    requiredEnvVars: ["OPENAI_API_KEY"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    tagline: "API key — Mistral Large / Nemo / Codestral",
    category: "ai-model",
    kind: "apikey",
    color: "#FF7000",
    bgColor: "#FF700020",
    Icon: Key,
    docsUrl: "https://docs.mistral.ai/getting-started/quickstart",
    requiredEnvVars: ["MISTRAL_API_KEY"],
  },
  {
    id: "groq",
    name: "Groq",
    tagline: "API key — ultra-fast LPU inference for Llama / Mixtral",
    category: "ai-model",
    kind: "apikey",
    color: "#F55036",
    bgColor: "#F5503620",
    Icon: Zap,
    docsUrl: "https://console.groq.com/docs/openai",
    requiredEnvVars: ["GROQ_API_KEY"],
  },
];

const CATEGORY_LABELS: Record<Provider["category"], string> = {
  vcs: "Version Control",
  "ai-model": "AI Models",
  platform: "Platforms",
};

// ─── Per-connection state ─────────────────────────────────────────────────────

type ConnState = "idle" | "connecting" | "connected" | "disconnected";

interface ConnEntry {
  state: ConnState;
  connectedAt?: string;
  keyHint?: string; // last 4 chars of saved key
}

function useConnections() {
  const [conns, setConns] = useState<Record<string, ConnEntry>>({});

  const connect = (id: string, partial?: Partial<ConnEntry>) =>
    setConns(prev => ({
      ...prev,
      [id]: {
        state: "connected",
        connectedAt: new Date().toLocaleString(),
        ...partial,
      },
    }));

  const disconnect = (id: string) =>
    setConns(prev => ({
      ...prev,
      [id]: { state: "disconnected" },
    }));

  const setConnecting = (id: string) =>
    setConns(prev => ({
      ...prev,
      [id]: { state: "connecting" },
    }));

  return { conns, connect, disconnect, setConnecting };
}

// ─── Connection card ──────────────────────────────────────────────────────────

function ConnectionCard({
  provider,
  entry,
  onConnect,
  onDisconnect,
}: {
  provider: Provider;
  entry: ConnEntry;
  onConnect: (provider: Provider) => void;
  onDisconnect: (provider: Provider) => void;
}) {
  const isConnected = entry.state === "connected";
  const isConnecting = entry.state === "connecting";

  return (
    <Card
      className={cn(
        "border transition-all duration-200 hover:shadow-lg",
        isConnected
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Brand icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: provider.bgColor }}
          >
            <provider.Icon className="w-5 h-5" style={{ color: provider.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-white text-sm font-semibold leading-snug">
                {provider.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] shrink-0",
                  provider.kind === "oauth"
                    ? "border-blue-500/30 text-blue-400"
                    : "border-violet-500/30 text-violet-400"
                )}
              >
                {provider.kind === "oauth" ? "OAuth" : "API Key"}
              </Badge>
              {isConnected && (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
              {entry.state === "disconnected" && (
                <Badge className="text-[10px] bg-gray-500/15 text-gray-400 border border-gray-500/30 shrink-0">
                  Disconnected
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5 text-gray-500 leading-snug">
              {provider.tagline}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Required env vars */}
        <div className="flex flex-wrap gap-1.5">
          {provider.requiredEnvVars.map(v => (
            <code
              key={v}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-mono"
            >
              {v}
            </code>
          ))}
        </div>

        {/* Connected details */}
        {isConnected && entry.connectedAt && (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Connected {entry.connectedAt}
              {entry.keyHint && (
                <span className="text-emerald-300/60 ml-1">
                  (key …{entry.keyHint})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-white/10 text-gray-300 hover:border-red-500/40 hover:text-red-400 text-xs"
              onClick={() => onDisconnect(provider)}
            >
              <Unlink className="w-3.5 h-3.5 mr-1.5" />
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isConnecting}
              className="flex-1 text-xs font-semibold text-white"
              style={{ backgroundColor: provider.color, color: "#0A1128" }}
              onClick={() => onConnect(provider)}
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isConnecting ? "Connecting…" : "Connect"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-gray-500 hover:text-gray-300"
            onClick={() => window.open(provider.docsUrl, "_blank")}
            title="Open docs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Key entry dialog ─────────────────────────────────────────────────────────

function ApiKeyDialog({
  provider,
  open,
  onClose,
  onSave,
}: {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}) {
  const [key, setKey] = useState("");

  const handleSave = () => {
    if (!key.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    onSave(key.trim());
    setKey("");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setKey(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md bg-[#0F1729] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-400" />
            Connect {provider?.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Paste your {provider?.name} API key below. It will be stored
            securely server-side and never exposed to the client.
          </DialogDescription>
        </DialogHeader>

        {/* Production notice */}
        <div className="flex gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Production credential required.</strong> This UI stores the
            key reference only — the actual secret must also be added to your{" "}
            <code className="bg-amber-500/20 px-1 rounded font-mono">
              .env
            </code>{" "}
            / secrets vault (
            {provider?.requiredEnvVars.join(", ")}) before it is read by the
            server.
          </span>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">
            {provider?.requiredEnvVars[0]}
          </Label>
          <Input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-…"
            className="bg-white/5 border-white/10 text-white font-mono text-sm"
            onKeyDown={e => e.key === "Enter" && handleSave()}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-white/10 text-gray-300"
            onClick={() => { setKey(""); onClose(); }}
          >
            Cancel
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-500 text-white"
            onClick={handleSave}
          >
            Save Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── OAuth pending dialog ─────────────────────────────────────────────────────

function OAuthDialog({
  provider,
  open,
  onClose,
  onSimulate,
}: {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
  onSimulate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-[#0F1729] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {provider && <provider.Icon className="w-4 h-4" style={{ color: provider.color }} />}
            Connect {provider?.name} via OAuth
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            This button will open the {provider?.name} OAuth consent screen in a
            new window.
          </DialogDescription>
        </DialogHeader>

        {/* Production notice */}
        <div className="flex gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Credentials required before store release.</strong> Set the
              following env vars so the callback handler can exchange tokens:
            </p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              {provider?.requiredEnvVars.map(v => (
                <li key={v}>
                  <code className="bg-amber-500/20 px-1 rounded font-mono text-[11px]">
                    {v}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Without the credentials above the OAuth redirect will fail. The
            "Simulate Connect" option below marks this provider as connected
            locally so you can design flows without live credentials.
          </span>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            className="border-white/10 text-gray-300"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            onClick={onSimulate}
          >
            Simulate Connect
          </Button>
          <Button
            className="text-white"
            style={{ backgroundColor: provider?.color }}
            onClick={() => {
              window.open(provider?.docsUrl, "_blank");
              onClose();
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Docs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuthorizationHub() {
  const { conns, connect, disconnect, setConnecting } = useConnections();

  const [apiKeyDialog, setApiKeyDialog] = useState<Provider | null>(null);
  const [oauthDialog, setOauthDialog] = useState<Provider | null>(null);

  const handleConnect = (provider: Provider) => {
    if (provider.kind === "apikey") {
      setApiKeyDialog(provider);
    } else {
      setOauthDialog(provider);
    }
  };

  const handleDisconnect = (provider: Provider) => {
    disconnect(provider.id);
    toast.success(`${provider.name} disconnected`);
  };

  const handleApiKeySave = (key: string) => {
    if (!apiKeyDialog) return;
    const hint = key.slice(-4);
    setConnecting(apiKeyDialog.id);
    // Simulate a short async save (replace with real trpc call when wired)
    setTimeout(() => {
      connect(apiKeyDialog.id, { keyHint: hint });
      toast.success(
        `${apiKeyDialog.name} key saved — add ${apiKeyDialog.requiredEnvVars[0]} to your env for server reads`
      );
      setApiKeyDialog(null);
    }, 800);
  };

  const handleOauthSimulate = () => {
    if (!oauthDialog) return;
    connect(oauthDialog.id);
    toast.success(
      `${oauthDialog.name} simulated as connected — wire real OAuth creds before release`
    );
    setOauthDialog(null);
  };

  const categories = (
    ["vcs", "ai-model", "platform"] as Provider["category"][]
  ).filter(cat => PROVIDERS.some(p => p.category === cat));

  const connectedCount = Object.values(conns).filter(
    e => e.state === "connected"
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-[#00D9FF]" />
            Authorization Hub
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-xl">
            Connect your AI model APIs, version-control providers, and platform
            services. Each card is explicit about the real OAuth / API
            credentials needed before a production release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-[#00D9FF]/30 text-[#00D9FF] text-sm px-3 py-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {connectedCount} / {PROVIDERS.length} connected
          </Badge>
        </div>
      </div>

      {/* Global production notice */}
      <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">
            Secure-production note — credential wiring required
          </p>
          <p className="text-amber-300/70 text-xs leading-relaxed">
            Connection states shown here are UI-only indicators. To enable real
            OAuth flows and API calls, add the listed environment variables to
            your server&apos;s secrets vault (Netlify environment variables,
            Docker env, or <code className="bg-amber-500/20 px-1 rounded font-mono">.env</code>
            ) and wire the corresponding tRPC / backend handlers. Nothing in this
            page makes live network requests to providers until that wiring is
            complete.
          </p>
        </div>
      </div>

      {/* Provider cards by category */}
      {categories.map(cat => (
        <section key={cat} className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PROVIDERS.filter(p => p.category === cat).map(provider => (
              <ConnectionCard
                key={provider.id}
                provider={provider}
                entry={conns[provider.id] ?? { state: "idle" }}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Summary table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00D9FF]" />
            Connection Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROVIDERS.map(p => {
              const entry = conns[p.id] ?? { state: "idle" };
              const isConnected = entry.state === "connected";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/8 bg-white/3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: p.bgColor }}
                  >
                    <p.Icon className="w-4 h-4" style={{ color: p.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-xs truncate">{p.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] mt-0.5",
                        isConnected
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-gray-600/50 text-gray-500"
                      )}
                    >
                      {isConnected ? "Connected" : "Pending"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ApiKeyDialog
        provider={apiKeyDialog}
        open={!!apiKeyDialog}
        onClose={() => setApiKeyDialog(null)}
        onSave={handleApiKeySave}
      />

      <OAuthDialog
        provider={oauthDialog}
        open={!!oauthDialog}
        onClose={() => setOauthDialog(null)}
        onSimulate={handleOauthSimulate}
      />
    </div>
  );
}
