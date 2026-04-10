/**
 * Netlify Functions — UnifyOne MCP Server (stateless JSON-RPC 2.0)
 * runtimeAPIVersion 1 compatible — uses export { handler } format.
 *
 * Stateless per-request JSON-RPC: no sessions, no SSE, no StreamableHTTP.
 * Routes via netlify.toml redirect: /mcp → /.netlify/functions/mcp-server
 */
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────
function jsonRpcOk(id: string | number | null, result: unknown) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ jsonrpc: "2.0", id, result }),
  };
}

function jsonRpcErr(id: string | number | null, code: number, message: string) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
  };
}

// ── Tool definitions (18 tools, 4 Cathedral phases) ──────────────────────────
const TOOLS = [
  // Foundation (2)
  { name: "listStores", description: "List all stores/tenants", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getTenantInfo", description: "Get tenant details by ID", inputSchema: { type: "object", required: ["tenantId"], properties: { tenantId: { type: "string" } } } },
  // Walls (11)
  { name: "listProducts", description: "List products with filters", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, limit: { type: "number" } } } },
  { name: "getProduct", description: "Get product by ID", inputSchema: { type: "object", required: ["productId"], properties: { productId: { type: "string" } } } },
  { name: "searchProducts", description: "Search products by keyword", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, tenantId: { type: "string" } } } },
  { name: "listOrders", description: "List orders", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, limit: { type: "number" } } } },
  { name: "getOrder", description: "Get order with line items", inputSchema: { type: "object", required: ["orderId"], properties: { orderId: { type: "string" } } } },
  { name: "listCustomers", description: "List customers", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, limit: { type: "number" } } } },
  { name: "getCustomer", description: "Get customer by ID", inputSchema: { type: "object", required: ["customerId"], properties: { customerId: { type: "string" } } } },
  { name: "getInventory", description: "Get inventory levels", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  { name: "getLowStockProducts", description: "Products below stock threshold", inputSchema: { type: "object", properties: { threshold: { type: "number" } } } },
  { name: "getAnalyticsSummary", description: "Revenue, order, customer summary", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  { name: "getRevenueByDay", description: "Daily revenue breakdown", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  // Vaults (3)
  { name: "getTopProducts", description: "Top products by revenue", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getWebhookEvents", description: "Recent webhook events", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getCategories", description: "Product categories", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  // Spire (2)
  { name: "getNotifications", description: "Platform notifications", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getPlatformStats", description: "Aggregated platform statistics", inputSchema: { type: "object", properties: {} } },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const db = await import("../../server/db");
  switch (name) {
    case "listStores": return db.getAllTenants();
    case "getTenantInfo": return db.getTenantById(args.tenantId as string);
    case "listProducts": return db.getProducts(args.tenantId as string | undefined, args.limit as number | undefined);
    case "getProduct": return db.getProductById(args.productId as string);
    case "searchProducts": {
      const all = await db.getProducts(args.tenantId as string | undefined) as any[];
      const q = (args.query as string).toLowerCase();
      return all.filter((p: any) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    case "listOrders": return db.getOrders(args.tenantId as string | undefined, args.limit as number | undefined);
    case "getOrder": return db.getOrderWithItems(args.orderId as string);
    case "listCustomers": return db.getCustomers(args.tenantId as string | undefined, args.limit as number | undefined);
    case "getCustomer": return db.getCustomerById(args.customerId as string);
    case "getInventory": return db.getInventory(args.tenantId as string | undefined);
    case "getLowStockProducts": return db.getLowStockProducts(args.threshold as number | undefined);
    case "getAnalyticsSummary": return db.getAnalyticsSummary(args.tenantId as string | undefined);
    case "getRevenueByDay": return db.getRevenueByDay(args.tenantId as string | undefined);
    case "getTopProducts": return db.getTopProducts(args.limit as number | undefined);
    case "getWebhookEvents": return db.getWebhookEvents(args.limit as number | undefined);
    case "getCategories": return db.getCategories(args.tenantId as string | undefined);
    case "getNotifications": {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { notifications } = await import("../../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      return drizzle.select().from(notifications).orderBy(desc(notifications.createdAt)).limit((args.limit as number) ?? 20);
    }
    case "getPlatformStats": {
      const [tenants, summary] = await Promise.all([db.getAllTenants(), db.getAnalyticsSummary(undefined)]);
      return { tenantCount: (tenants as any[]).length, ...(summary as any ?? {}), ts: new Date().toISOString() };
    }
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Netlify Function handler ──────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" }, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body: { jsonrpc: string; id: string | number | null; method: string; params?: Record<string, unknown> };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return jsonRpcErr(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return jsonRpcOk(id, { protocolVersion: "2024-11-05", serverInfo: { name: "unifyone-mcp", version: "2.0.0" }, capabilities: { tools: { listChanged: false } } });

    case "tools/list":
      return jsonRpcOk(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params.name as string;
      if (!toolName) return jsonRpcErr(id, -32602, "Missing tool name");
      try {
        const result = await callTool(toolName, (params.arguments ?? {}) as Record<string, unknown>);
        return jsonRpcOk(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (e: any) {
        return jsonRpcOk(id, { content: [{ type: "text", text: e.message }], isError: true });
      }
    }

    default:
      return jsonRpcErr(id, -32601, `Method not found: ${method}`);
  }
};
