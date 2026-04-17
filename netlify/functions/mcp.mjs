/**
 * Netlify Functions v2 — UnifyOne MCP Server (stateless JSON-RPC 2.0)
 *
 * Handles:
 *   GET  /mcp        → health probe (McpHealthResponse shape)
 *   POST /mcp        → JSON-RPC 2.0 (tools/list, tools/call, initialize)
 *   OPTIONS /mcp     → CORS preflight
 *
 * Auth: inbound requests must supply  Authorization: Bearer <MCP_API_KEY>
 *       on POST requests when MCP_API_KEY env var is set.
 *
 * Tool names use snake_case to match the platform's expected convention.
 */

// ── Config ────────────────────────────────────────────────────────────────────
export const config = { path: "/mcp" };

const SERVICE_NAME = "unifyone-mcp";
const SERVICE_VERSION = "2.1.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── Tool definitions (20 tools, 4 Cathedral phases) ──────────────────────────
const TOOLS = [
  // Foundation (2)
  {
    name: "list_stores",
    description: "List all stores / tenants registered on the platform",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max results" } } },
  },
  {
    name: "get_tenant_info",
    description: "Get tenant details by numeric tenant ID",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" } } },
  },
  // Walls — Products (5)
  {
    name: "list_products",
    description: "List products with optional tenant and limit filters",
    inputSchema: { type: "object", properties: { tenant_id: { type: "number" }, limit: { type: "number" } } },
  },
  {
    name: "get_product",
    description: "Get a single product by its numeric ID",
    inputSchema: { type: "object", required: ["product_id"], properties: { product_id: { type: "number" }, tenant_id: { type: "number" } } },
  },
  {
    name: "search_products",
    description: "Full-text search across product names and descriptions",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, tenant_id: { type: "number" } } },
  },
  {
    name: "get_inventory",
    description: "Get current inventory levels for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, product_id: { type: "number" } } },
  },
  {
    name: "get_low_stock_products",
    description: "Return products whose stock is at or below a threshold",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, threshold: { type: "number", default: 5 } } },
  },
  // Walls — Orders (2)
  {
    name: "list_orders",
    description: "List orders with optional tenant and limit filters",
    inputSchema: { type: "object", properties: { tenant_id: { type: "number" }, limit: { type: "number" } } },
  },
  {
    name: "get_order",
    description: "Get a single order with its line items",
    inputSchema: { type: "object", required: ["order_id"], properties: { order_id: { type: "number" }, tenant_id: { type: "number" } } },
  },
  // Walls — Customers (2)
  {
    name: "list_customers",
    description: "List customers for a tenant",
    inputSchema: { type: "object", properties: { tenant_id: { type: "number" }, limit: { type: "number" } } },
  },
  {
    name: "get_customer",
    description: "Get a customer by their numeric ID",
    inputSchema: { type: "object", required: ["customer_id"], properties: { customer_id: { type: "number" }, tenant_id: { type: "number" } } },
  },
  // Walls — Catalog (1)
  {
    name: "get_categories",
    description: "List product categories for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" } } },
  },
  // Vaults — Analytics (4)
  {
    name: "get_analytics_summary",
    description: "Revenue, order count, and customer summary for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, days: { type: "number", default: 30 } } },
  },
  {
    name: "get_revenue_by_day",
    description: "Daily revenue breakdown for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, days: { type: "number", default: 30 } } },
  },
  {
    name: "get_top_products",
    description: "Top-selling products by revenue for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, limit: { type: "number", default: 5 } } },
  },
  {
    name: "get_webhook_events",
    description: "Recent webhook events for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, limit: { type: "number", default: 50 } } },
  },
  // Spire — Platform (2)
  {
    name: "get_notifications",
    description: "Platform-wide notifications (most recent first)",
    inputSchema: { type: "object", properties: { limit: { type: "number", default: 20 } } },
  },
  {
    name: "get_platform_stats",
    description: "Aggregated cross-tenant platform statistics",
    inputSchema: { type: "object", properties: {} },
  },
  // Spire — AI (2, new)
  {
    name: "ask_kai",
    description: "Ask Kai, the UnifyOne AI assistant, a commerce-related question",
    inputSchema: {
      type: "object",
      required: ["question"],
      properties: {
        question: { type: "string" },
        context: { type: "object", description: "Optional additional context (tenant_id, page, etc.)" },
      },
    },
  },
  {
    name: "create_order",
    description: "Create a new order for a tenant",
    inputSchema: {
      type: "object",
      required: ["tenant_id", "items"],
      properties: {
        tenant_id: { type: "number" },
        customer_email: { type: "string" },
        items: {
          type: "array",
          items: { type: "object", required: ["product_id", "quantity"], properties: { product_id: { type: "number" }, quantity: { type: "number" }, unit_price: { type: "number" } } },
        },
        payment_method: { type: "string", enum: ["stripe", "paypal", "square", "shopify"] },
        notes: { type: "string" },
      },
    },
  },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────
async function callTool(name, args) {
  const db = await import("../../server/db.js");

  switch (name) {
    case "list_stores":
      return db.getAllTenants();

    case "get_tenant_info":
      return db.getTenantById(Number(args.tenant_id));

    case "list_products": {
      const tenantId = args.tenant_id != null ? Number(args.tenant_id) : undefined;
      return db.getProducts(tenantId, args.limit != null ? Number(args.limit) : undefined);
    }

    case "get_product":
      return db.getProductById(Number(args.product_id), Number(args.tenant_id ?? 0));

    case "search_products": {
      const tenantId = args.tenant_id != null ? Number(args.tenant_id) : undefined;
      const all = await db.getProducts(tenantId);
      const q = String(args.query).toLowerCase();
      return all.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    case "get_inventory":
      return db.getInventory(Number(args.tenant_id), args.product_id != null ? Number(args.product_id) : undefined);

    case "get_low_stock_products":
      return db.getLowStockProducts(Number(args.tenant_id));

    case "list_orders": {
      const tenantId = args.tenant_id != null ? Number(args.tenant_id) : undefined;
      return db.getOrders(tenantId, args.limit != null ? Number(args.limit) : undefined);
    }

    case "get_order":
      return db.getOrderWithItems(Number(args.order_id), Number(args.tenant_id ?? 0));

    case "list_customers": {
      const tenantId = args.tenant_id != null ? Number(args.tenant_id) : undefined;
      return db.getCustomers(tenantId, args.limit != null ? Number(args.limit) : undefined);
    }

    case "get_customer":
      return db.getCustomerById(Number(args.customer_id), Number(args.tenant_id ?? 0));

    case "get_categories":
      return db.getCategories(Number(args.tenant_id));

    case "get_analytics_summary":
      return db.getAnalyticsSummary(Number(args.tenant_id), args.days != null ? Number(args.days) : 30);

    case "get_revenue_by_day":
      return db.getRevenueByDay(Number(args.tenant_id), args.days != null ? Number(args.days) : 30);

    case "get_top_products":
      return db.getTopProducts(Number(args.tenant_id), args.limit != null ? Number(args.limit) : 5);

    case "get_webhook_events":
      return db.getWebhookEvents(Number(args.tenant_id), args.limit != null ? Number(args.limit) : 50);

    case "get_notifications": {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { notifications } = await import("../../drizzle/schema.js");
      const { desc } = await import("drizzle-orm");
      return drizzle
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(args.limit != null ? Number(args.limit) : 20);
    }

    case "get_platform_stats": {
      const [tenants, summary] = await Promise.all([
        db.getAllTenants(),
        db.getAnalyticsSummary(0, 30).catch(() => null),
      ]);
      return {
        tenant_count: tenants.length,
        ...(summary ?? {}),
        ts: new Date().toISOString(),
      };
    }

    case "ask_kai": {
      // Stub: real implementation would call the LLM service / claudeGovernance router.
      // Returns a structured placeholder so callers can verify the tool is wired.
      return {
        answer: `Kai received your question: "${args.question}". Connect MCP_API_KEY and BUILT_IN_FORGE_API_KEY to enable full AI responses.`,
        model: "kai-stub",
        ts: new Date().toISOString(),
      };
    }

    case "create_order": {
      return db.createOrder({
        tenantId: Number(args.tenant_id),
        customerEmail: args.customer_email != null ? String(args.customer_email) : null,
        status: "pending",
        paymentMethod: args.payment_method ?? "stripe",
        notes: args.notes ?? null,
        items: Array.isArray(args.items) ? args.items : [],
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────
function rpcOk(id, result) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function rpcErr(id, code, message) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async (req) => {
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health probe — GET /mcp returns McpHealthResponse shape
  if (method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        tools: TOOLS.length,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Inbound API key authentication
  const mcpApiKey = process.env.MCP_API_KEY ?? "";
  if (mcpApiKey) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader !== `Bearer ${mcpApiKey}`) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unauthorized" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Parse JSON-RPC body
  let body;
  try {
    body = await req.json();
  } catch {
    return rpcErr(null, -32700, "Parse error");
  }

  const { id = null, method: rpcMethod, params = {} } = body;

  switch (rpcMethod) {
    case "initialize":
      return rpcOk(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: SERVICE_NAME, version: SERVICE_VERSION },
        capabilities: { tools: { listChanged: false } },
      });

    case "tools/list":
      return rpcOk(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params.name;
      if (!toolName) return rpcErr(id, -32602, "Missing params.name");
      try {
        const result = await callTool(toolName, params.arguments ?? {});
        return rpcOk(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        return rpcOk(id, { content: [{ type: "text", text: e.message }], isError: true });
      }
    }

    case "ping":
      return rpcOk(id, {});

    default:
      return rpcErr(id, -32601, `Method not found: ${rpcMethod}`);
  }
};
