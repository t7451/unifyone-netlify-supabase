/**
 * client/src/components/MCPStatusWidget.tsx
 *
 * Live MCP status indicator, tool browser, and Claude Desktop config generator.
 * Used in: Dashboard sidebar, Settings page, IntegrationGuides.
 *
 * Shows:
 * - Worker health (green/red dot)
 * - Tool count + list
 * - One-click copy for Claude Desktop config
 * - Direct link to Inspector
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap, Copy, Check, ExternalLink, ChevronDown, ChevronUp,
  Radio, Cpu, Wrench, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Tool phase categorisation ─────────────────────────────────────────────────
const TOOL_PHASES: Record<string, { phase: string; color: string }> = {
  listStores: { phase: "Foundation", color: "#F0D080" },
  getTenantInfo: { phase: "Foundation", color: "#F0D080" },
  listProducts: { phase: "Walls", color: "#6EE7B7" },
  getProduct: { phase: "Walls", color: "#6EE7B7" },
  searchProducts: { phase: "Walls", color: "#6EE7B7" },
  listOrders: { phase: "Walls", color: "#6EE7B7" },
  getOrder: { phase: "Walls", color: "#6EE7B7" },
  listCustomers: { phase: "Walls", color: "#6EE7B7" },
  getCustomer: { phase: "Walls", color: "#6EE7B7" },
  getInventory: { phase: "Walls", color: "#6EE7B7" },
  getLowStockProducts: { phase: "Walls", color: "#6EE7B7" },
  getAnalyticsSummary: { phase: "Walls", color: "#6EE7B7" },
  getRevenueByDay: { phase: "Walls", color: "#6EE7B7" },
  getTopProducts: { phase: "Walls", color: "#6EE7B7" },
  getWebhookEvents: { phase: "Vaults", color: "#93C5FD" },
  getNotifications: { phase: "Vaults", color: "#93C5FD" },
  getCategories: { phase: "Vaults", color: "#93C5FD" },
  getPlatformStats: { phase: "Spire", color: "#C4B5FD" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface MCPStatusWidgetProps {
  /** compact: just the status dot + tool count badge */
  variant?: "compact" | "full" | "settings";
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MCPStatusWidget({
  variant = "full",
  className,
}: MCPStatusWidgetProps) {
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const health = trpc.mcp.health.useQuery(undefined, {
    refetchInterval: 60_000, // re-check every minute
    retry: 1,
  });

  const config = trpc.mcp.config.useQuery(undefined, {
    enabled: variant !== "compact",
    retry: 1,
  });

  const isUp = health.data?.status === "ok";
  const toolCount = (health.data as any)?.tools ?? config.data?.toolCount ?? 0;

  const handleCopyConfig = () => {
    if (!config.data?.claudeDesktopConfig) return;
    navigator.clipboard.writeText(config.data.claudeDesktopConfig).then(() => {
      setCopied(true);
      toast.success("Claude Desktop config copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Compact variant (just a status badge) ──────────────────────────────────
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className="relative"
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: health.isLoading ? "#5A5A5A" : isUp ? "#6EE7B7" : "#FCA5A5",
          }}
        >
          {isUp && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "#6EE7B7", opacity: 0.4 }}
            />
          )}
        </div>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#5A5A5A" }}>
          MCP {isUp ? "online" : health.isLoading ? "checking…" : "offline"}
        </span>
        {isUp && toolCount > 0 && (
          <Badge
            variant="outline"
            style={{
              fontSize: 10, padding: "1px 6px",
              borderColor: "rgba(240,208,128,0.2)",
              color: "#F0D080",
            }}
          >
            {toolCount} tools
          </Badge>
        )}
      </div>
    );
  }

  // ── Settings variant ───────────────────────────────────────────────────────
  if (variant === "settings") {
    return (
      <Card className={cn("border-[#242424] bg-[#0A0A0A]", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Cpu className="w-4 h-4 text-[#F0D080]" />
            UnifyOne MCP Server
            <div className="ml-auto flex items-center gap-2">
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: health.isLoading ? "#5A5A5A" : isUp ? "#6EE7B7" : "#FCA5A5",
                  position: "relative",
                }}
              >
                {isUp && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: "#6EE7B7", opacity: 0.4 }}
                  />
                )}
              </div>
              <span style={{ fontSize: 11, color: isUp ? "#6EE7B7" : "#FCA5A5" }}>
                {health.isLoading ? "Checking…" : isUp ? "Online" : "Offline"}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoints */}
          <div className="space-y-2">
            {[
              { label: "Worker URL", value: config.data?.workerUrl ?? "…" },
              { label: "MCP Endpoint", value: config.data?.endpoint ?? "…" },
              { label: "Custom Domain", value: config.data?.customDomain ?? "Pending" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: "#5A5A5A" }}>{row.label}</span>
                <code style={{ fontSize: 11, color: "#9A9A9A", fontFamily: "'DM Mono', monospace" }}>
                  {row.value}
                </code>
              </div>
            ))}
          </div>

          {/* Tool count */}
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ background: "#161616", border: "1px solid #242424" }}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-3 h-3 text-[#F0D080]" />
              <span style={{ fontSize: 13, color: "#E8E0D0" }}>Registered tools</span>
            </div>
            <Badge
              style={{
                background: "rgba(240,208,128,0.1)",
                border: "1px solid rgba(240,208,128,0.2)",
                color: "#F0D080",
                fontSize: 12,
              }}
            >
              {toolCount}
            </Badge>
          </div>

          {/* Claude Desktop config */}
          <div>
            <div style={{ fontSize: 12, color: "#5A5A5A", marginBottom: 8 }}>
              Claude Desktop / claude.ai config
            </div>
            <div
              className="rounded-lg p-3 relative"
              style={{
                background: "#080808",
                border: "1px solid #242424",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "#6EE7B7",
                lineHeight: 1.6,
              }}
            >
              <pre className="whitespace-pre-wrap break-all" style={{ margin: 0 }}>
                {config.data?.claudeDesktopConfig ?? "Loading…"}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyConfig}
                className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-500 hover:text-white"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Inspector link */}
          <a
            href={`https://inspector.mcp.run/?url=${encodeURIComponent(config.data?.endpoint ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="w-full border-[#242424] text-gray-400 hover:text-white gap-2">
              <ExternalLink className="w-3 h-3" />
              Open MCP Inspector
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  // ── Full variant (dashboard card) ──────────────────────────────────────────
  return (
    <Card className={cn("border-[#242424] bg-[#0A0A0A]", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-white">
          <Radio className="w-3.5 h-3.5 text-[#F0D080]" />
          MCP Server
          <div className="ml-auto flex items-center gap-1.5">
            <div style={{ position: "relative", width: 7, height: 7 }}>
              <div
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: health.isLoading ? "#5A5A5A" : isUp ? "#6EE7B7" : "#FCA5A5",
                }}
              />
              {isUp && (
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "#6EE7B7", opacity: 0.4 }}
                />
              )}
            </div>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: isUp ? "#6EE7B7" : "#5A5A5A" }}>
              {health.isLoading ? "…" : isUp ? "online" : "offline"}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Tools", value: String(toolCount || "…") },
            { label: "Latency", value: isUp ? "<30ms" : "—" },
            { label: "Worker", value: "CF Edge" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md p-2 text-center"
              style={{ background: "#161616", border: "1px solid #1E1E1E" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D0" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "#3A3A3A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tool list toggle */}
        <button
          onClick={() => setToolsExpanded(!toolsExpanded)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5A5A5A" }}
        >
          <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Wrench className="w-3 h-3" />
            Registered tools ({toolCount})
          </span>
          {toolsExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {toolsExpanded && config.data?.tools && (
          <ScrollArea className="h-52">
            <div className="space-y-1 pr-2">
              {config.data.tools.map((tool) => {
                const meta = TOOL_PHASES[tool.name] ?? { phase: "Unknown", color: "#5A5A5A" };
                return (
                  <div
                    key={tool.name}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-md"
                    style={{ background: "#0D0D0D" }}
                  >
                    <span
                      style={{
                        fontSize: 9, padding: "1px 5px", borderRadius: 4,
                        background: `${meta.color}15`,
                        border: `1px solid ${meta.color}25`,
                        color: meta.color, flexShrink: 0, marginTop: 2,
                        fontFamily: "'DM Mono', monospace",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {meta.phase}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#9A9A9A" }}>
                        {tool.name}
                      </div>
                      {tool.description && (
                        <div style={{ fontSize: 11, color: "#3A3A3A", lineHeight: 1.4 }}>
                          {tool.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Copy config */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyConfig}
          disabled={!config.data?.claudeDesktopConfig}
          className="w-full h-8 gap-2 text-xs text-gray-500 hover:text-white border border-[#1E1E1E] hover:border-[#3A3A3A]"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-green-400" /> Copied!</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy Claude Desktop config</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
