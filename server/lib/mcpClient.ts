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
 *   const result = await mcpClient.callTool("listStores", { tenantId });
 */

// KAI_MCP_NGROK_URL lets a developer point Kai's MCP calls at a locally
// tunneled MCP worker (e.g. an ngrok URL fronting a dev Cloudflare Worker
// running via `wrangler dev`). Honored only outside production so a stray
// env var can't redirect production traffic.
export const MCP_WORKER_URL =
  (process.env.NODE_ENV !== "production" && process.env.KAI_MCP_NGROK_URL) ||
  process.env.MCP_WORKER_URL ||
  "https://unify0ne-mcp.skdev-371.workers.dev";

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

export interface McpHealthResponse {
  status: "ok";
  service: string;
  version: string;
  tools: number;
  timestamp: string;
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
    apiKey ??
    process.env.ONECOMMERCE_API_KEY ??
    process.env.MCP_API_KEY ??
    "";
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
    throw new Error(`MCP Worker HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    result?: T;
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
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
 * tools/list — returns all 18 registered MCP tools with schemas.
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
  apiKey?: string
): Promise<unknown> {
  const result = await rpc<McpToolResult>(
    "tools/call",
    { name: toolName, arguments: args },
    apiKey
  );

  if (result?.isError) {
    throw new Error(result.content?.[0]?.text ?? "MCP tool error");
  }

  const text = result?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
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

// ── Named tool shortcuts (matches the 18 registered tools) ───────────────────

export const mcpClient = {
  health: mcpHealth,
  initialize: mcpInitialize,
  listTools: mcpListTools,
  callTool: mcpCallTool,

  // Foundation tier (stores + tenants)
  listStores: (args?: Record<string, unknown>) =>
    mcpCallTool("listStores", args ?? {}),
  getTenantInfo: (tenantId: string) =>
    mcpCallTool("getTenantInfo", { tenantId }),

  // Walls tier (products + orders + customers)
  listProducts: (args?: Record<string, unknown>) =>
    mcpCallTool("listProducts", args ?? {}),
  getProduct: (productId: string) =>
    mcpCallTool("getProduct", { productId }),
  searchProducts: (query: string, tenantId?: string) =>
    mcpCallTool("searchProducts", { query, ...(tenantId ? { tenantId } : {}) }),
  listOrders: (args?: Record<string, unknown>) =>
    mcpCallTool("listOrders", args ?? {}),
  getOrder: (orderId: string) =>
    mcpCallTool("getOrder", { orderId }),
  listCustomers: (args?: Record<string, unknown>) =>
    mcpCallTool("listCustomers", args ?? {}),
  getCustomer: (customerId: string) =>
    mcpCallTool("getCustomer", { customerId }),
  getInventory: (args?: Record<string, unknown>) =>
    mcpCallTool("getInventory", args ?? {}),
  getLowStock: (threshold?: number) =>
    mcpCallTool("getLowStockProducts", threshold ? { threshold } : {}),
  getAnalytics: (tenantId?: string) =>
    mcpCallTool("getAnalyticsSummary", tenantId ? { tenantId } : {}),
  getRevenue: (args?: Record<string, unknown>) =>
    mcpCallTool("getRevenueByDay", args ?? {}),
  getTopProducts: (limit?: number) =>
    mcpCallTool("getTopProducts", limit ? { limit } : {}),

  // Vaults tier (webhooks + notifications)
  getWebhooks: (args?: Record<string, unknown>) =>
    mcpCallTool("getWebhookEvents", args ?? {}),
  getNotifications: (args?: Record<string, unknown>) =>
    mcpCallTool("getNotifications", args ?? {}),
  getCategories: (tenantId?: string) =>
    mcpCallTool("getCategories", tenantId ? { tenantId } : {}),

  // Spire tier (AI + platform insights)
  getPlatformStats: () => mcpCallTool("getPlatformStats", {}),
  askKai: (question: string, context?: Record<string, unknown>) =>
    mcpCallTool("askKai", { question, ...(context ?? {}) }),
};
