/**
 * Netlify Functions — UnifyOne MCP Server (stateless JSON-RPC 2.0)
 *
 * Stateless implementation — no StreamableHTTPServerTransport (that requires
 * persistent SSE sessions incompatible with Netlify Functions).
 *
 * Each POST to /mcp is a complete JSON-RPC exchange:
 *   initialize → returns server capabilities
 *   tools/list  → returns 18 tool schemas
 *   tools/call  → dispatches to handler, returns result
 *
 * Routes: /mcp (via netlify.toml redirect)
 */

// ── Types ─────────────────────────────────────────────────────────────────────
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

function ok(id: string | number | null, result: unknown): Response {
  return Response.json({ jsonrpc: "2.0", id, result } satisfies JsonRpcResponse, {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function rpcErr(id: string | number | null, code: number, message: string): Response {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } } satisfies JsonRpcResponse,
    { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  // Foundation
  { name: "listStores", description: "List all stores/tenants in the platform", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getTenantInfo", description: "Get details for a specific tenant", inputSchema: { type: "object", properties: { tenantId: { type: "string" } }, required: ["tenantId"] } },
  // Walls
  { name: "listProducts", description: "List products with optional filters", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, limit: { type: "number" }, category: { type: "string" } } } },
  { name: "getProduct", description: "Get a specific product by ID", inputSchema: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"] } },
  { name: "searchProducts", description: "Search products by keyword", inputSchema: { type: "object", properties: { query: { type: "string" }, tenantId: { type: "string" } }, required: ["query"] } },
  { name: "listOrders", description: "List orders with filters", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, status: { type: "string" }, limit: { type: "number" } } } },
  { name: "getOrder", description: "Get a specific order with line items", inputSchema: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] } },
  { name: "listCustomers", description: "List customers", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, limit: { type: "number" } } } },
  { name: "getCustomer", description: "Get a specific customer by ID", inputSchema: { type: "object", properties: { customerId: { type: "string" } }, required: ["customerId"] } },
  { name: "getInventory", description: "Get inventory levels", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  { name: "getLowStockProducts", description: "Get products below stock threshold", inputSchema: { type: "object", properties: { threshold: { type: "number" } } } },
  { name: "getAnalyticsSummary", description: "Get revenue, order, and customer summary", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  { name: "getRevenueByDay", description: "Get daily revenue breakdown", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, days: { type: "number" } } } },
  { name: "getTopProducts", description: "Get top-performing products by revenue", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  // Vaults
  { name: "getWebhookEvents", description: "Get recent webhook event log", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getNotifications", description: "Get platform notifications", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "getCategories", description: "Get product categories", inputSchema: { type: "object", properties: { tenantId: { type: "string" } } } },
  // Spire
  { name: "getPlatformStats", description: "Get aggregated platform statistics", inputSchema: { type: "object", properties: {} } },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    const {
      getDb, getProducts, getProductById, getCategories, getOrders,
      getOrderWithItems, getCustomers, getCustomerById, getAnalyticsSummary,
      getRevenueByDay, getTopProducts, getInventory, getLowStockProducts,
      getWebhookEvents, getAllTenants, getTenantById,
    } = await import("../../server/db");

    const db = await getDb();

    switch (name) {
      case "listStores":
        return await getAllTenants();
      case "getTenantInfo":
        return await getTenantById(args.tenantId as string);
      case "listProducts":
        return await getProducts(args.tenantId as string | undefined, args.limit as number | undefined);
      case "getProduct":
        return await getProductById(args.productId as string);
      case "searchProducts": {
        const products = await getProducts(args.tenantId as string | undefined);
        const q = (args.query as string).toLowerCase();
        return (products as any[]).filter((p: any) =>
          p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        );
      }
      case "listOrders":
        return await getOrders(args.tenantId as string | undefined, args.limit as number | undefined);
      case "getOrder":
        return await getOrderWithItems(args.orderId as string);
      case "listCustomers":
        return await getCustomers(args.tenantId as string | undefined, args.limit as number | undefined);
      case "getCustomer":
        return await getCustomerById(args.customerId as string);
      case "getInventory":
        return await getInventory(args.tenantId as string | undefined);
      case "getLowStockProducts":
        return await getLowStockProducts(args.threshold as number | undefined);
      case "getAnalyticsSummary":
        return await getAnalyticsSummary(args.tenantId as string | undefined);
      case "getRevenueByDay":
        return await getRevenueByDay(args.tenantId as string | undefined);
      case "getTopProducts":
        return await getTopProducts(args.limit as number | undefined);
      case "getWebhookEvents":
        return await getWebhookEvents(args.limit as number | undefined);
      case "getCategories":
        return await getCategories(args.tenantId as string | undefined);
      case "getNotifications": {
        if (!db) return [];
        const { notifications } = await import("../../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit((args.limit as number) ?? 20);
      }
      case "getPlatformStats": {
        const [tenants, summary] = await Promise.all([
          getAllTenants(),
          getAnalyticsSummary(undefined),
        ]);
        return {
          tenantCount: (tenants as any[]).length,
          ...((summary as any) ?? {}),
          timestamp: new Date().toISOString(),
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    throw new Error(`Tool ${name} failed: ${err.message}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: JsonRpcRequest;
  try {
    body = await req.json() as JsonRpcRequest;
  } catch {
    return rpcErr(null, -32700, "Parse error: invalid JSON");
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "unifyone-mcp", version: "2.0.0" },
        capabilities: { tools: { listChanged: false } },
      });

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params.name as string;
      const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

      if (!toolName) return rpcErr(id, -32602, "Missing tool name");

      try {
        const result = await callTool(toolName, toolArgs);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (err: any) {
        return ok(id, {
          content: [{ type: "text", text: err.message }],
          isError: true,
        });
      }
    }

    default:
      return rpcErr(id, -32601, `Method not found: ${method}`);
  }
};

export const config = {
  path: "/mcp",
};
