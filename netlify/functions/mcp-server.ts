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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, result }),
  };
}

function jsonRpcErr(id: string | number | null, code: number, message: string) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
  };
}

// ── Tool definitions (18 tools, 4 Cathedral phases) ──────────────────────────
const TOOLS = [
  // Foundation (2)
  {
    name: "listStores",
    description: "List all stores/tenants",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "getTenantInfo",
    description: "Get tenant details by ID",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" } },
    },
  },
  // Walls (11)
  {
    name: "listProducts",
    description: "List products with filters",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "getProduct",
    description: "Get product by ID",
    inputSchema: {
      type: "object",
      required: ["productId", "tenantId"],
      properties: {
        productId: { type: "number" },
        tenantId: { type: "number" },
      },
    },
  },
  {
    name: "searchProducts",
    description: "Search products by keyword",
    inputSchema: {
      type: "object",
      required: ["query", "tenantId"],
      properties: { query: { type: "string" }, tenantId: { type: "number" } },
    },
  },
  {
    name: "listOrders",
    description: "List orders",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "getOrder",
    description: "Get order with line items",
    inputSchema: {
      type: "object",
      required: ["orderId", "tenantId"],
      properties: { orderId: { type: "number" }, tenantId: { type: "number" } },
    },
  },
  {
    name: "listCustomers",
    description: "List customers",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "getCustomer",
    description: "Get customer by ID",
    inputSchema: {
      type: "object",
      required: ["customerId", "tenantId"],
      properties: {
        customerId: { type: "number" },
        tenantId: { type: "number" },
      },
    },
  },
  {
    name: "getInventory",
    description: "Get inventory levels",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" } },
    },
  },
  {
    name: "getLowStockProducts",
    description: "Products below stock threshold",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: {
        tenantId: { type: "number" },
        threshold: { type: "number" },
      },
    },
  },
  {
    name: "getAnalyticsSummary",
    description: "Revenue, order, customer summary",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, days: { type: "number" } },
    },
  },
  {
    name: "getRevenueByDay",
    description: "Daily revenue breakdown",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, days: { type: "number" } },
    },
  },
  // Vaults (3)
  {
    name: "getTopProducts",
    description: "Top products by revenue",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "getWebhookEvents",
    description: "Recent webhook events",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" }, limit: { type: "number" } },
    },
  },
  {
    name: "getCategories",
    description: "Product categories",
    inputSchema: {
      type: "object",
      required: ["tenantId"],
      properties: { tenantId: { type: "number" } },
    },
  },
  // Spire (2)
  {
    name: "getNotifications",
    description: "Platform notifications",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "getPlatformStats",
    description: "Aggregated platform statistics",
    inputSchema: { type: "object", properties: {} },
  },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────
function parsePositiveInteger(value: unknown, name: string): number;
function parsePositiveInteger(
  value: unknown,
  name: string,
  options: { required?: true; defaultValue?: number }
): number;
function parsePositiveInteger(
  value: unknown,
  name: string,
  options: { required: false; defaultValue: number }
): number;
function parsePositiveInteger(
  value: unknown,
  name: string,
  options: { required: false; defaultValue?: undefined }
): number | undefined;
function parsePositiveInteger(
  value: unknown,
  name: string,
  {
    required = true,
    defaultValue,
  }: { required?: boolean; defaultValue?: number } = {}
): number | undefined {
  if (value == null || value === "") {
    if (required) throw new Error(`Missing required numeric ${name}`);
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric ${name}`);
  }
  return parsed;
}

function parseLimit(value: unknown, defaultValue: number): number;
function parseLimit(
  value: unknown,
  defaultValue?: undefined
): number | undefined;
function parseLimit(value: unknown, defaultValue?: number) {
  if (defaultValue === undefined) {
    return parsePositiveInteger(value, "limit", { required: false });
  }
  return parsePositiveInteger(value, "limit", {
    required: false,
    defaultValue,
  });
}

function parseDays(value: unknown, defaultValue = 30): number {
  return parsePositiveInteger(value, "days", { required: false, defaultValue });
}

function applyLimit<T>(rows: T[], limit: number | undefined) {
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const db = await import("../../server/db");
  switch (name) {
    case "listStores": {
      const tenants = await db.getAllTenants();
      return applyLimit(tenants, parseLimit(args.limit));
    }
    case "getTenantInfo":
      return db.getTenantById(parsePositiveInteger(args.tenantId, "tenantId"));
    case "listProducts":
      return db.getProducts(parsePositiveInteger(args.tenantId, "tenantId"), {
        limit: parseLimit(args.limit, 50),
      });
    case "getProduct":
      return db.getProductById(
        parsePositiveInteger(args.productId, "productId"),
        parsePositiveInteger(args.tenantId, "tenantId")
      );
    case "searchProducts": {
      const all = await db.getProducts(
        parsePositiveInteger(args.tenantId, "tenantId"),
        { search: String(args.query ?? "") }
      );
      const q = String(args.query ?? "").toLowerCase();
      return all.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    case "listOrders":
      return db.getOrders(parsePositiveInteger(args.tenantId, "tenantId"), {
        limit: parseLimit(args.limit, 50),
      });
    case "getOrder":
      return db.getOrderWithItems(
        parsePositiveInteger(args.orderId, "orderId"),
        parsePositiveInteger(args.tenantId, "tenantId")
      );
    case "listCustomers":
      return db.getCustomers(parsePositiveInteger(args.tenantId, "tenantId"), {
        limit: parseLimit(args.limit, 50),
      });
    case "getCustomer":
      return db.getCustomerById(
        parsePositiveInteger(args.customerId, "customerId"),
        parsePositiveInteger(args.tenantId, "tenantId")
      );
    case "getInventory":
      return db.getInventory(parsePositiveInteger(args.tenantId, "tenantId"));
    case "getLowStockProducts": {
      const rows = await db.getLowStockProducts(
        parsePositiveInteger(args.tenantId, "tenantId")
      );
      const threshold = parsePositiveInteger(args.threshold, "threshold", {
        required: false,
      });
      if (threshold == null) return rows;
      return rows.filter((row: any) => Number(row?.inv?.quantity) <= threshold);
    }
    case "getAnalyticsSummary":
      return db.getAnalyticsSummary(
        parsePositiveInteger(args.tenantId, "tenantId"),
        parseDays(args.days)
      );
    case "getRevenueByDay":
      return db.getRevenueByDay(
        parsePositiveInteger(args.tenantId, "tenantId"),
        parseDays(args.days)
      );
    case "getTopProducts":
      return db.getTopProducts(
        parsePositiveInteger(args.tenantId, "tenantId"),
        parseLimit(args.limit, 5)
      );
    case "getWebhookEvents":
      return db.getWebhookEvents(
        parsePositiveInteger(args.tenantId, "tenantId"),
        parseLimit(args.limit, 50)
      );
    case "getCategories":
      return db.getCategories(parsePositiveInteger(args.tenantId, "tenantId"));
    case "getNotifications": {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { notifications } = await import("../../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      return drizzle
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit((args.limit as number) ?? 20);
    }
    case "getPlatformStats": {
      const tenants = await db.getAllTenants();
      const tenantIds = tenants
        .map(tenant => Number(tenant?.id))
        .filter(tenantId => Number.isSafeInteger(tenantId) && tenantId > 0);
      const summaries = await Promise.all(
        tenantIds.map(tenantId =>
          db.getAnalyticsSummary(tenantId, 30).catch(() => null)
        )
      );
      const totals = summaries.reduce<{
        totalRevenue: number;
        orderCount: number;
        customerCount: number;
        productCount: number;
      }>(
        (acc, summary) => ({
          totalRevenue: acc.totalRevenue + Number(summary?.totalRevenue ?? 0),
          orderCount: acc.orderCount + Number(summary?.orderCount ?? 0),
          customerCount:
            acc.customerCount + Number(summary?.customerCount ?? 0),
          productCount: acc.productCount + Number(summary?.productCount ?? 0),
        }),
        { totalRevenue: 0, orderCount: 0, customerCount: 0, productCount: 0 }
      );
      return {
        tenantCount: tenants.length,
        ...totals,
        ts: new Date().toISOString(),
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Netlify Function handler ──────────────────────────────────────────────────
export const handler: Handler = async (
  event: HandlerEvent,
  _ctx: HandlerContext
) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body: {
    jsonrpc: string;
    id: string | number | null;
    method: string;
    params?: Record<string, unknown>;
  };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return jsonRpcErr(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return jsonRpcOk(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "unifyone-mcp", version: "2.0.0" },
        capabilities: { tools: { listChanged: false } },
      });

    case "tools/list":
      return jsonRpcOk(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params.name as string;
      if (!toolName) return jsonRpcErr(id, -32602, "Missing tool name");
      try {
        const result = await callTool(
          toolName,
          (params.arguments ?? {}) as Record<string, unknown>
        );
        return jsonRpcOk(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (e: any) {
        return jsonRpcOk(id, {
          content: [{ type: "text", text: e.message }],
          isError: true,
        });
      }
    }

    default:
      return jsonRpcErr(id, -32601, `Method not found: ${method}`);
  }
};
