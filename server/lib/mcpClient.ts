/**
 * server/lib/mcpClient.ts
 *
 * Lightweight JSON-RPC 2.0 client for the UnifyOne MCP Worker.
 * Wraps calls to https://unify0ne-mcp.skdev-371.workers.dev/mcp
 *
 * Cathedral Framework — Spire layer.
 * This is the internal bridge between the UnifyOne platform and the
 * Cloudflare Workers MCP server. All tool calls are routed here.
 *
 * Usage:
 *   import { mcpClient } from "@/lib/mcpClient";
 *   const tools = await mcpClient.listTools();
 *   const result = await mcpClient.callTool("list_stores", { tenant_id });
 */

import { resolveKaiMcpUrl } from "../_core/ngrok";

// resolveKaiMcpUrl is the single source of truth for env-based precedence:
// it honors KAI_MCP_NGROK_URL outside production, then falls back to
// MCP_WORKER_URL. The default below covers the case where neither is set.
export const MCP_WORKER_URL =
  resolveKaiMcpUrl() || "https://unify0ne-mcp.skdev-371.workers.dev";

const MCP_ENDPOINT = `${MCP_WORKER_URL}/mcp`;

let _rpcId = 1;
function nextId() {
  return _rpcId++;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface McpCallToolOptions {
  apiKey?: string;
  /**
   * When present, this tenant ID replaces any tenant_id/tenantId in args.
   * Pass null to remove tenant scoping from the outgoing payload.
   */
  authoritativeTenantId?: string | number | null;
}

export interface McpHealthResponse {
  status: "ok";
  service: string;
  version: string;
  tools: number;
  timestamp: string;
}

export class McpClientError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      status?: number;
      code?: number;
      method?: string;
      toolName?: string;
    }
  ) {
    super(message);
    this.name = "McpClientError";
  }
}

export const MCP_TOOL_NAMES = [
  "list_stores",
  "get_tenant_info",
  "list_products",
  "get_product",
  "search_products",
  "get_inventory",
  "get_low_stock_products",
  "list_orders",
  "get_order",
  "list_customers",
  "get_customer",
  "get_categories",
  "get_analytics_summary",
  "get_revenue_by_day",
  "get_top_products",
  "get_webhook_events",
  "get_notifications",
  "get_platform_stats",
  "ask_kai",
  "create_order",
  "list_deals",
  "get_deal",
  "search_deals",
  "get_deal_recommendations",
  "manage_wishlist",
  "track_deal_conversion",
  "generate_deal_content",
  "get_feature_flags",
  "set_feature_flag",
  "get_theme_sections",
  "sync_theme_config",
  "get_theme_performance",
  "update_section_settings",
  "get_loyalty_config",
  "list_compounds",
  "get_compound",
  "simulate_compound_purity",
  "get_coa_data",
  "list_terp_products",
  "compare_terpene_profiles",
  "query_graph",
  "get_graph_stats",
  "trigger_graph_ingest",
  "search_graph_nodes",
  "get_brain_activity",
  "get_connector_configs",
  "list_pixel_assets",
  "get_pixel_asset",
  "create_pixel_asset",
  "export_sprite_sheet",
  "get_asset_metadata",
] as const;

export type McpKnownToolName = (typeof MCP_TOOL_NAMES)[number];

const MCP_TOOL_NAME_SET = new Set<string>(MCP_TOOL_NAMES);

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

const CAMEL_CASE_TOOL_ALIASES = MCP_TOOL_NAMES.reduce<Record<string, string>>(
  (aliases, toolName) => {
    aliases[toCamelCase(toolName)] = toolName;
    return aliases;
  },
  {}
);

export function normalizeMcpToolName(toolName: string): string {
  const trimmed = toolName.trim();
  if (!trimmed) {
    throw new McpClientError("MCP tool name is required");
  }

  if (!/^[A-Za-z0-9_ -]+$/.test(trimmed)) {
    throw new McpClientError(`Invalid MCP tool name "${toolName}"`);
  }

  if (MCP_TOOL_NAME_SET.has(trimmed)) return trimmed;
  if (CAMEL_CASE_TOOL_ALIASES[trimmed]) return CAMEL_CASE_TOOL_ALIASES[trimmed];

  const snakeName = toSnakeCase(trimmed);
  return snakeName;
}

export function normalizeMcpToolArguments(
  args: Record<string, unknown> = {},
  options: Pick<McpCallToolOptions, "authoritativeTenantId"> = {}
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || key === "tenantId" || key === "tenant_id") {
      continue;
    }

    const normalizedKey = key.includes("_") ? key : toSnakeCase(key);
    const preferCurrentKey = key === normalizedKey;
    if (!(normalizedKey in normalized) || preferCurrentKey) {
      normalized[normalizedKey] = value;
    }
  }

  if ("authoritativeTenantId" in options) {
    if (
      options.authoritativeTenantId !== null &&
      options.authoritativeTenantId !== undefined
    ) {
      normalized.tenant_id = options.authoritativeTenantId;
    }
    return normalized;
  }

  if (args.tenant_id !== undefined && args.tenant_id !== null) {
    normalized.tenant_id = args.tenant_id;
  } else if (args.tenantId !== undefined && args.tenantId !== null) {
    normalized.tenant_id = args.tenantId;
  }

  return normalized;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ── Low-level JSON-RPC caller ─────────────────────────────────────────────────

async function rpc<T = unknown>(
  method: string,
  params?: Record<string, unknown>,
  apiKey?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const key =
    apiKey ?? process.env.ONECOMMERCE_API_KEY ?? process.env.MCP_API_KEY ?? "";
  if (key) headers["Authorization"] = `Bearer ${key}`;

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: nextId(),
    method,
    params: params ?? {},
  });

  const res = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body,
    // CF Workers respond fast — 10s ceiling
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new McpClientError(
      `MCP Worker HTTP ${res.status} for ${method}: ${await res.text()}`,
      { status: res.status, method }
    );
  }

  const json = (await res.json()) as {
    result?: T;
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new McpClientError(
      `MCP JSON-RPC ${method} error ${json.error.code}: ${json.error.message}`,
      { code: json.error.code, method }
    );
  }

  return json.result as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * GET /health — returns service status and registered tool count.
 */
export async function mcpHealth(): Promise<McpHealthResponse> {
  const res = await fetch(`${MCP_WORKER_URL}/health`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`MCP health check failed: HTTP ${res.status}`);
  return res.json() as Promise<McpHealthResponse>;
}

/**
 * tools/list — returns all registered MCP tools with schemas.
 */
export async function mcpListTools(): Promise<McpTool[]> {
  const result = await rpc<{ tools: McpTool[] }>("tools/list");
  return result?.tools ?? [];
}

/**
 * tools/call — invoke a named MCP tool with arguments.
 * Returns the parsed text content from the first result block.
 */
export async function mcpCallTool(
  toolName: string,
  args: Record<string, unknown> = {},
  apiKeyOrOptions?: string | McpCallToolOptions
): Promise<unknown> {
  const options =
    typeof apiKeyOrOptions === "string"
      ? { apiKey: apiKeyOrOptions }
      : (apiKeyOrOptions ?? {});
  const normalizedToolName = normalizeMcpToolName(toolName);
  const normalizedArgs = normalizeMcpToolArguments(args, options);

  const result = await rpc<McpToolResult>(
    "tools/call",
    { name: normalizedToolName, arguments: normalizedArgs },
    options.apiKey
  );

  if (result?.isError) {
    throw new McpClientError(
      `MCP tool "${normalizedToolName}" failed: ${
        result.content?.[0]?.text ?? "tool returned an error"
      }`,
      { toolName: normalizedToolName }
    );
  }

  const text = result?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch (error) {
    if (text === "{}") {
      throw new McpClientError(
        `MCP tool "${normalizedToolName}" returned empty or invalid content: ${getErrorMessage(
          error
        )}`,
        { toolName: normalizedToolName }
      );
    }
    return text;
  }
}

/**
 * Convenience: run the MCP initialize handshake and return server capabilities.
 */
export async function mcpInitialize(): Promise<Record<string, unknown>> {
  return rpc<Record<string, unknown>>("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "unifyone-platform", version: "1.0.0" },
  });
}

// ── Named tool shortcuts (legacy camelCase methods, snake_case over the wire) ─

export const mcpClient = {
  health: mcpHealth,
  initialize: mcpInitialize,
  listTools: mcpListTools,
  callTool: mcpCallTool,

  // Foundation tier (stores + tenants)
  listStores: (args?: Record<string, unknown>) =>
    mcpCallTool("list_stores", args ?? {}),
  getTenantInfo: (tenantId: string) =>
    mcpCallTool("get_tenant_info", { tenantId }),

  // Walls tier (products + orders + customers)
  listProducts: (args?: Record<string, unknown>) =>
    mcpCallTool("list_products", args ?? {}),
  getProduct: (productId: string) => mcpCallTool("get_product", { productId }),
  searchProducts: (query: string, tenantId?: string) =>
    mcpCallTool("search_products", {
      query,
      ...(tenantId ? { tenantId } : {}),
    }),
  listOrders: (args?: Record<string, unknown>) =>
    mcpCallTool("list_orders", args ?? {}),
  getOrder: (orderId: string) => mcpCallTool("get_order", { orderId }),
  listCustomers: (args?: Record<string, unknown>) =>
    mcpCallTool("list_customers", args ?? {}),
  getCustomer: (customerId: string) =>
    mcpCallTool("get_customer", { customerId }),
  getInventory: (args?: Record<string, unknown>) =>
    mcpCallTool("get_inventory", args ?? {}),
  getLowStock: (threshold?: number) =>
    mcpCallTool("get_low_stock_products", threshold ? { threshold } : {}),
  getAnalytics: (tenantId?: string) =>
    mcpCallTool("get_analytics_summary", tenantId ? { tenantId } : {}),
  getRevenue: (args?: Record<string, unknown>) =>
    mcpCallTool("get_revenue_by_day", args ?? {}),
  getTopProducts: (limit?: number) =>
    mcpCallTool("get_top_products", limit ? { limit } : {}),

  // Vaults tier (webhooks + notifications)
  getWebhooks: (args?: Record<string, unknown>) =>
    mcpCallTool("get_webhook_events", args ?? {}),
  getNotifications: (args?: Record<string, unknown>) =>
    mcpCallTool("get_notifications", args ?? {}),
  getCategories: (tenantId?: string) =>
    mcpCallTool("get_categories", tenantId ? { tenantId } : {}),

  // Spire tier (AI + platform insights)
  getPlatformStats: () => mcpCallTool("get_platform_stats", {}),
  askKai: (question: string, context?: Record<string, unknown>) =>
    mcpCallTool("ask_kai", { question, ...(context ?? {}) }),
};
