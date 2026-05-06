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
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
  Cpu,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Tool phase categorisation ─────────────────────────────────────────────────
type ToolMeta = { phase: string; color: string };
type ToolSummary = { name: string; description?: string };

const PHASE_META = {
  foundation: { phase: "Foundation", color: "#F0D080" },
  walls: { phase: "Walls", color: "#6EE7B7" },
  vaults: { phase: "Vaults", color: "#93C5FD" },
  spire: { phase: "Spire", color: "#C4B5FD" },
  dealflow: { phase: "DealFlow", color: "#F9A8D4" },
  shopify: { phase: "Shopify", color: "#86EFAC" },
  terpforge: { phase: "TerpForge", color: "#FDBA74" },
  graph: { phase: "Graph", color: "#67E8F9" },
  pixelforge: { phase: "PixelForge", color: "#F0ABFC" },
  custom: { phase: "Custom", color: "#9A9A9A" },
} satisfies Record<string, ToolMeta>;

const TOOL_PHASES: Record<string, ToolMeta> = {
  // Live Netlify catalog uses snake_case. Keep legacy aliases for older bridges.
  list_stores: PHASE_META.foundation,
  listStores: PHASE_META.foundation,
  get_tenant_info: PHASE_META.foundation,
  getTenantInfo: PHASE_META.foundation,
  list_products: PHASE_META.walls,
  listProducts: PHASE_META.walls,
  get_product: PHASE_META.walls,
  getProduct: PHASE_META.walls,
  search_products: PHASE_META.walls,
  searchProducts: PHASE_META.walls,
  get_inventory: PHASE_META.walls,
  getInventory: PHASE_META.walls,
  get_low_stock_products: PHASE_META.walls,
  getLowStockProducts: PHASE_META.walls,
  list_orders: PHASE_META.walls,
  listOrders: PHASE_META.walls,
  get_order: PHASE_META.walls,
  getOrder: PHASE_META.walls,
  list_customers: PHASE_META.walls,
  listCustomers: PHASE_META.walls,
  get_customer: PHASE_META.walls,
  getCustomer: PHASE_META.walls,
  get_categories: PHASE_META.walls,
  getCategories: PHASE_META.walls,
  create_order: PHASE_META.walls,
  get_analytics_summary: PHASE_META.vaults,
  getAnalyticsSummary: PHASE_META.vaults,
  get_revenue_by_day: PHASE_META.vaults,
  getRevenueByDay: PHASE_META.vaults,
  get_top_products: PHASE_META.vaults,
  getTopProducts: PHASE_META.vaults,
  get_webhook_events: PHASE_META.vaults,
  getWebhookEvents: PHASE_META.vaults,
  get_notifications: PHASE_META.spire,
  getNotifications: PHASE_META.spire,
  get_platform_stats: PHASE_META.spire,
  getPlatformStats: PHASE_META.spire,
  ask_kai: PHASE_META.spire,
  askKai: PHASE_META.spire,
};

function inferToolMeta(name: string): ToolMeta {
  if (TOOL_PHASES[name]) return TOOL_PHASES[name];
  if (
    name.includes("deal") ||
    name.includes("wishlist") ||
    name.includes("feature_flag")
  )
    return PHASE_META.dealflow;
  if (
    name.includes("theme") ||
    name.includes("section") ||
    name.includes("loyalty")
  )
    return PHASE_META.shopify;
  if (
    name.includes("terp") ||
    name.includes("compound") ||
    name.includes("coa")
  )
    return PHASE_META.terpforge;
  if (
    name.includes("graph") ||
    name.includes("brain") ||
    name.includes("connector")
  )
    return PHASE_META.graph;
  if (
    name.includes("pixel") ||
    name.includes("sprite") ||
    name.includes("asset")
  )
    return PHASE_META.pixelforge;
  return PHASE_META.custom;
}

function getToolCount(candidate: unknown): number | undefined {
  if (typeof candidate === "number" && Number.isFinite(candidate))
    return candidate;
  if (typeof candidate === "string") {
    const parsed = Number.parseInt(candidate, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (Array.isArray(candidate)) return candidate.length;
  return undefined;
}

function normalizeTools(candidate: unknown): ToolSummary[] {
  if (!Array.isArray(candidate)) return [];
  const tools: ToolSummary[] = [];
  for (const tool of candidate) {
    if (typeof tool === "string") {
      tools.push({ name: tool });
      continue;
    }
    if (!tool || typeof tool !== "object" || !("name" in tool)) continue;
    const name = (tool as { name?: unknown }).name;
    if (typeof name !== "string" || !name.trim()) continue;
    const description = (tool as { description?: unknown }).description;
    tools.push({
      name,
      description: typeof description === "string" ? description : undefined,
    });
  }
  return tools;
}

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
  const healthToolCount = getToolCount(
    (health.data as { tools?: unknown } | undefined)?.tools
  );
  const toolCatalog = normalizeTools(
    (config.data as { tools?: unknown } | undefined)?.tools
  );
  const configToolCount =
    toolCatalog.length > 0
      ? toolCatalog.length
      : getToolCount(config.data?.toolCount);
  const toolCount = configToolCount ?? healthToolCount ?? 0;

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
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: health.isLoading
              ? "#5A5A5A"
              : isUp
                ? "#6EE7B7"
                : "#FCA5A5",
          }}
        >
          {isUp && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "#6EE7B7", opacity: 0.4 }}
            />
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            color: "#5A5A5A",
          }}
        >
          MCP {isUp ? "online" : health.isLoading ? "checking…" : "offline"}
        </span>
        {isUp && toolCount > 0 && (
          <Badge
            variant="outline"
            style={{
              fontSize: 10,
              padding: "1px 6px",
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
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: health.isLoading
                    ? "#5A5A5A"
                    : isUp
                      ? "#6EE7B7"
                      : "#FCA5A5",
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
              <span
                style={{ fontSize: 11, color: isUp ? "#6EE7B7" : "#FCA5A5" }}
              >
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
              {
                label: "Custom Domain",
                value: config.data?.customDomain ?? "Pending",
              },
            ].map(row => (
              <div
                key={row.label}
                className="flex items-center justify-between"
              >
                <span style={{ fontSize: 12, color: "#5A5A5A" }}>
                  {row.label}
                </span>
                <code
                  style={{
                    fontSize: 11,
                    color: "#9A9A9A",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
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
              <span style={{ fontSize: 13, color: "#E8E0D0" }}>
                Registered tools
              </span>
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
          <p style={{ fontSize: 11, color: "#5A5A5A", lineHeight: 1.5 }}>
            Live tools prefer snake_case names such as{" "}
            <code>list_products</code>. Legacy camelCase aliases still work when
            your bridge agent maps them.
          </p>

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
              <pre
                className="whitespace-pre-wrap break-all"
                style={{ margin: 0 }}
              >
                {config.data?.claudeDesktopConfig ?? "Loading…"}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyConfig}
                className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-500 hover:text-white"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Inspector link */}
          <a
            href={`https://inspector.mcp.run/?url=${encodeURIComponent(config.data?.endpoint ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#242424] text-gray-400 hover:text-white gap-2"
            >
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
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: health.isLoading
                    ? "#5A5A5A"
                    : isUp
                      ? "#6EE7B7"
                      : "#FCA5A5",
                }}
              />
              {isUp && (
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "#6EE7B7", opacity: 0.4 }}
                />
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "'DM Mono', monospace",
                color: isUp ? "#6EE7B7" : "#5A5A5A",
              }}
            >
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
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-md p-2 text-center"
              style={{ background: "#161616", border: "1px solid #1E1E1E" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D0" }}>
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#3A3A3A",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tool list toggle */}
        <button
          onClick={() => setToolsExpanded(!toolsExpanded)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#5A5A5A",
          }}
        >
          <span
            style={{
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Wrench className="w-3 h-3" />
            Registered tools ({toolCount})
          </span>
          {toolsExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {toolsExpanded && (
          <ScrollArea className="h-64">
            <div className="space-y-1 pr-2">
              <p
                style={{
                  fontSize: 11,
                  color: "#5A5A5A",
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                Displaying the live catalog as returned by MCP. Prefer
                snake_case; legacy camelCase aliases depend on bridge support.
              </p>
              {toolCatalog.length === 0 && (
                <div
                  style={{ fontSize: 11, color: "#5A5A5A", padding: "6px 8px" }}
                >
                  Tool details are unavailable, but the health check reports{" "}
                  {toolCount} tools.
                </div>
              )}
              {toolCatalog.map(tool => {
                const meta = inferToolMeta(tool.name);
                return (
                  <div
                    key={tool.name}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-md"
                    style={{ background: "#0D0D0D" }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: `${meta.color}15`,
                        border: `1px solid ${meta.color}25`,
                        color: meta.color,
                        flexShrink: 0,
                        marginTop: 2,
                        fontFamily: "'DM Mono', monospace",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {meta.phase}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: "'DM Mono', monospace",
                          color: "#9A9A9A",
                        }}
                      >
                        {tool.name}
                      </div>
                      {tool.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#3A3A3A",
                            lineHeight: 1.4,
                          }}
                        >
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
            <>
              <Check className="w-3 h-3 text-green-400" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copy Claude Desktop config
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
