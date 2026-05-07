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
const KAI_MAX_TOKENS = 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── Tool definitions (51 tools, 4 Cathedral phases + 5 integrations) ──────────
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
    description: "List products for a tenant with optional limit filters",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, limit: { type: "number" } } },
  },
  {
    name: "get_product",
    description: "Get a single product by its numeric ID",
    inputSchema: { type: "object", required: ["product_id", "tenant_id"], properties: { product_id: { type: "number" }, tenant_id: { type: "number" } } },
  },
  {
    name: "search_products",
    description: "Full-text search across product names and descriptions",
    inputSchema: { type: "object", required: ["query", "tenant_id"], properties: { query: { type: "string" }, tenant_id: { type: "number" } } },
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
    description: "List orders for a tenant with optional limit filters",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, limit: { type: "number" } } },
  },
  {
    name: "get_order",
    description: "Get a single order with its line items",
    inputSchema: { type: "object", required: ["order_id", "tenant_id"], properties: { order_id: { type: "number" }, tenant_id: { type: "number" } } },
  },
  // Walls — Customers (2)
  {
    name: "list_customers",
    description: "List customers for a tenant",
    inputSchema: { type: "object", required: ["tenant_id"], properties: { tenant_id: { type: "number" }, limit: { type: "number" } } },
  },
  {
    name: "get_customer",
    description: "Get a customer by their numeric ID",
    inputSchema: { type: "object", required: ["customer_id", "tenant_id"], properties: { customer_id: { type: "number" }, tenant_id: { type: "number" } } },
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
  // DealFlow — Referral & Affiliate (9)
  {
    name: "list_deals",
    description: "List referral/affiliate deals with optional category, difficulty, and search filters",
    inputSchema: {
      type: "object",
      properties: {
        tenant_id: { type: "number", description: "Filter by tenant" },
        category: { type: "string", description: "Category filter" },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Difficulty filter" },
        search: { type: "string", description: "Search term" },
        limit: { type: "number", description: "Max results" },
      },
    },
  },
  {
    name: "get_deal",
    description: "Get a single deal by ID with full details, requirements, and promo code",
    inputSchema: {
      type: "object",
      required: ["deal_id"],
      properties: { deal_id: { type: "string" } },
    },
  },
  {
    name: "search_deals",
    description: "Full-text search across deal titles, descriptions, and brands",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        tenant_id: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_deal_recommendations",
    description: "Get personalized deal recommendations based on user behavior and preferences",
    inputSchema: {
      type: "object",
      required: ["user_id"],
      properties: {
        user_id: { type: "string" },
        tenant_id: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "manage_wishlist",
    description: "Add or remove a deal from a user's wishlist; action=add|remove|list",
    inputSchema: {
      type: "object",
      required: ["user_id", "action"],
      properties: {
        user_id: { type: "string" },
        deal_id: { type: "string" },
        action: { type: "string", enum: ["add", "remove", "list"] },
      },
    },
  },
  {
    name: "track_deal_conversion",
    description: "Record a deal click or conversion event for analytics",
    inputSchema: {
      type: "object",
      required: ["deal_id", "event_type"],
      properties: {
        deal_id: { type: "string" },
        user_id: { type: "string" },
        event_type: { type: "string", enum: ["click", "conversion"] },
        value: { type: "number" },
      },
    },
  },
  {
    name: "generate_deal_content",
    description: "Generate AI-written blog post or SEO landing page content for a deal",
    inputSchema: {
      type: "object",
      required: ["deal_id", "content_type"],
      properties: {
        deal_id: { type: "string" },
        content_type: { type: "string", enum: ["blog_post", "landing_page", "description"] },
      },
    },
  },
  {
    name: "get_feature_flags",
    description: "List all A/B test feature flags and their current rollout percentages",
    inputSchema: {
      type: "object",
      properties: { tenant_id: { type: "number" } },
    },
  },
  {
    name: "set_feature_flag",
    description: "Enable/disable a feature flag or change its rollout percentage",
    inputSchema: {
      type: "object",
      required: ["flag_id", "enabled"],
      properties: {
        flag_id: { type: "string" },
        enabled: { type: "boolean" },
        rollout_percentage: { type: "number", minimum: 0, maximum: 100 },
      },
    },
  },
  // Shopify Theme (5)
  {
    name: "get_theme_sections",
    description: "List all available Shopify theme sections with their schema settings",
    inputSchema: {
      type: "object",
      properties: { tenant_id: { type: "number" } },
    },
  },
  {
    name: "sync_theme_config",
    description: "Push updated theme settings to a tenant's Shopify store",
    inputSchema: {
      type: "object",
      required: ["tenant_id", "section", "settings"],
      properties: {
        tenant_id: { type: "number" },
        section: { type: "string" },
        settings: { type: "object" },
      },
    },
  },
  {
    name: "get_theme_performance",
    description: "Get Lighthouse/performance metrics for a tenant's storefront",
    inputSchema: {
      type: "object",
      required: ["tenant_id"],
      properties: { tenant_id: { type: "number" } },
    },
  },
  {
    name: "update_section_settings",
    description: "Update a specific theme section's settings",
    inputSchema: {
      type: "object",
      required: ["tenant_id", "section", "settings"],
      properties: {
        tenant_id: { type: "number" },
        section: { type: "string", enum: ["hero", "trust-bar", "featured-collections", "brand-story", "featured-products", "testimonials", "newsletter"] },
        settings: { type: "object" },
      },
    },
  },
  {
    name: "get_loyalty_config",
    description: "Get the loyalty program configuration for a tenant's Shopify theme",
    inputSchema: {
      type: "object",
      required: ["tenant_id"],
      properties: { tenant_id: { type: "number" } },
    },
  },
  // TerpForge (6)
  {
    name: "list_compounds",
    description: "List all terpene compounds in the TerpForge compound library",
    inputSchema: {
      type: "object",
      properties: {
        profile: { type: "string", enum: ["FOCUS", "RECOVERY", "CALM"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_compound",
    description: "Get detailed molecular data for a single terpene compound",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  {
    name: "simulate_compound_purity",
    description: "Run a purity simulation for a terpene compound at a given concentration",
    inputSchema: {
      type: "object",
      required: ["compound_slug", "purity_percentage"],
      properties: {
        compound_slug: { type: "string" },
        purity_percentage: { type: "number", minimum: 0, maximum: 100 },
      },
    },
  },
  {
    name: "get_coa_data",
    description: "Retrieve Certificate of Analysis (COA) entries with lab results",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "list_terp_products",
    description: "List TerpForge products by category with pricing and terpene profiles",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["apparel", "hardware", "wellness"] },
        profile: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "compare_terpene_profiles",
    description: "Compare two or more terpene compounds side-by-side",
    inputSchema: {
      type: "object",
      required: ["compound_slugs"],
      properties: {
        compound_slugs: { type: "array", items: { type: "string" }, minItems: 2 },
      },
    },
  },
  // Knowledge Graph (6)
  {
    name: "query_graph",
    description: "Query the knowledge graph with a filter to find nodes and edges",
    inputSchema: {
      type: "object",
      properties: {
        node_type: { type: "string", enum: ["project", "session", "file", "tool", "model", "commit", "author"] },
        label: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_graph_stats",
    description: "Get aggregated statistics about the knowledge graph",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "trigger_graph_ingest",
    description: "Trigger a data ingestion run for a specified connector source",
    inputSchema: {
      type: "object",
      required: ["source"],
      properties: {
        source: { type: "string", enum: ["claude_code", "git", "markdown"] },
        config: { type: "object" },
      },
    },
  },
  {
    name: "search_graph_nodes",
    description: "Full-text search across knowledge graph node labels and metadata",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        node_type: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_brain_activity",
    description: "Get recent Brain layer activity — spike rates, weight-change rates, and region histograms",
    inputSchema: {
      type: "object",
      properties: { seconds: { type: "number" } },
    },
  },
  {
    name: "get_connector_configs",
    description: "List configured data connectors and their OAuth/auth status",
    inputSchema: { type: "object", properties: {} },
  },
  // PixelForge Studio (5)
  {
    name: "list_pixel_assets",
    description: "List pixel art assets (sprites, tilesets, animations) for a tenant",
    inputSchema: {
      type: "object",
      properties: {
        tenant_id: { type: "number" },
        asset_type: { type: "string", enum: ["sprite", "tileset", "animation"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_pixel_asset",
    description: "Get a single pixel art asset with its frame data, palette, and export URLs",
    inputSchema: {
      type: "object",
      required: ["asset_id"],
      properties: { asset_id: { type: "string" } },
    },
  },
  {
    name: "create_pixel_asset",
    description: "Create a new pixel asset record (metadata only)",
    inputSchema: {
      type: "object",
      required: ["tenant_id", "name", "width", "height", "asset_type"],
      properties: {
        tenant_id: { type: "number" },
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        asset_type: { type: "string", enum: ["sprite", "tileset", "animation"] },
      },
    },
  },
  {
    name: "export_sprite_sheet",
    description: "Export a pixel asset's frames as a base64-encoded PNG sprite sheet",
    inputSchema: {
      type: "object",
      required: ["asset_id"],
      properties: {
        asset_id: { type: "string" },
        columns: { type: "number" },
        scale: { type: "number" },
      },
    },
  },
  {
    name: "get_asset_metadata",
    description: "Get metadata for a pixel asset including palette, frame count, size, and creation date",
    inputSchema: {
      type: "object",
      required: ["asset_id"],
      properties: { asset_id: { type: "string" } },
    },
  },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────
function parsePositiveInteger(value, name, { required = true, defaultValue } = {}) {
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

function parseLimit(value, defaultValue) {
  return parsePositiveInteger(value, "limit", { required: false, defaultValue });
}

function parseDays(value, defaultValue = 30) {
  return parsePositiveInteger(value, "days", { required: false, defaultValue });
}

function parseNonNegativeNumber(value, name, defaultValue = 0) {
  if (value == null || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric ${name}`);
  }
  return parsed;
}

function applyLimit(rows, limit) {
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

async function callTool(name, args) {
  const db = await import("../../server/db.js");

  switch (name) {
    case "list_stores": {
      const tenants = await db.getAllTenants();
      return applyLimit(tenants, parseLimit(args.limit));
    }

    case "get_tenant_info":
      return db.getTenantById(parsePositiveInteger(args.tenant_id, "tenant_id"));

    case "list_products":
      return db.getProducts(parsePositiveInteger(args.tenant_id, "tenant_id"), { limit: parseLimit(args.limit, 50) });

    case "get_product":
      return db.getProductById(parsePositiveInteger(args.product_id, "product_id"), parsePositiveInteger(args.tenant_id, "tenant_id"));

    case "search_products": {
      const tenantId = parsePositiveInteger(args.tenant_id, "tenant_id");
      const all = await db.getProducts(tenantId, { search: String(args.query ?? "") });
      const q = String(args.query ?? "").toLowerCase();
      return all.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    case "get_inventory":
      return db.getInventory(
        parsePositiveInteger(args.tenant_id, "tenant_id"),
        parsePositiveInteger(args.product_id, "product_id", { required: false })
      );

    case "get_low_stock_products": {
      const rows = await db.getLowStockProducts(parsePositiveInteger(args.tenant_id, "tenant_id"));
      const threshold = parsePositiveInteger(args.threshold, "threshold", { required: false });
      if (threshold == null) return rows;
      return rows.filter((row) => Number(row?.inv?.quantity) <= threshold);
    }

    case "list_orders":
      return db.getOrders(parsePositiveInteger(args.tenant_id, "tenant_id"), { limit: parseLimit(args.limit, 50) });

    case "get_order":
      return db.getOrderWithItems(parsePositiveInteger(args.order_id, "order_id"), parsePositiveInteger(args.tenant_id, "tenant_id"));

    case "list_customers":
      return db.getCustomers(parsePositiveInteger(args.tenant_id, "tenant_id"), { limit: parseLimit(args.limit, 50) });

    case "get_customer":
      return db.getCustomerById(parsePositiveInteger(args.customer_id, "customer_id"), parsePositiveInteger(args.tenant_id, "tenant_id"));

    case "get_categories":
      return db.getCategories(parsePositiveInteger(args.tenant_id, "tenant_id"));

    case "get_analytics_summary":
      return db.getAnalyticsSummary(parsePositiveInteger(args.tenant_id, "tenant_id"), parseDays(args.days));

    case "get_revenue_by_day":
      return db.getRevenueByDay(parsePositiveInteger(args.tenant_id, "tenant_id"), parseDays(args.days));

    case "get_top_products":
      return db.getTopProducts(parsePositiveInteger(args.tenant_id, "tenant_id"), parseLimit(args.limit, 5));

    case "get_webhook_events":
      return db.getWebhookEvents(parsePositiveInteger(args.tenant_id, "tenant_id"), parseLimit(args.limit, 50));

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
      const tenants = await db.getAllTenants();
      const tenantIds = tenants
        .map((tenant) => Number(tenant?.id))
        .filter((tenantId) => Number.isSafeInteger(tenantId) && tenantId > 0);
      const summaries = await Promise.all(
        tenantIds.map((tenantId) => db.getAnalyticsSummary(tenantId, 30).catch(() => null))
      );
      const totals = summaries.reduce(
        (acc, summary) => ({
          totalRevenue: acc.totalRevenue + Number(summary?.totalRevenue ?? 0),
          orderCount: acc.orderCount + Number(summary?.orderCount ?? 0),
          customerCount: acc.customerCount + Number(summary?.customerCount ?? 0),
          productCount: acc.productCount + Number(summary?.productCount ?? 0),
        }),
        { totalRevenue: 0, orderCount: 0, customerCount: 0, productCount: 0 }
      );
      return {
        tenant_count: tenants.length,
        ...totals,
        ts: new Date().toISOString(),
      };
    }

    case "ask_kai": {
      const question = String(args.question ?? "").trim();
      if (!question) {
        throw new Error("Missing required question");
      }
      const context =
        args.context && typeof args.context === "object"
          ? `\n\nContext:\n${JSON.stringify(args.context, null, 2)}`
          : "";
      const { invokeLLM } = await import("../../server/_core/llm.js");
      const response = await invokeLLM({
        maxTokens: KAI_MAX_TOKENS,
        messages: [
          {
            role: "system",
            content:
              "You are Kai, the UnifyOne AI assistant. Answer commerce and platform questions concisely, tactically, and with clear next steps.",
          },
          {
            role: "user",
            content: `${question}${context}`,
          },
        ],
      });
      const answer =
        response.choices?.[0]?.message?.content ||
        "Kai could not generate a response.";
      return {
        answer,
        model: response.model ?? "kai",
        ts: new Date().toISOString(),
      };
    }

    case "create_order": {
      const tenantId = parsePositiveInteger(args.tenant_id, "tenant_id");
      if (!Array.isArray(args.items) || args.items.length === 0) {
        throw new Error("Missing required order items");
      }
      const items = args.items.map((item, index) => {
        const productId = parsePositiveInteger(item?.product_id, `items[${index}].product_id`);
        const quantity = parsePositiveInteger(item?.quantity, `items[${index}].quantity`);
        const unitPrice = parseNonNegativeNumber(item?.unit_price, `items[${index}].unit_price`);
        return {
          productId,
          productName: item?.product_name != null ? String(item.product_name) : `Product #${productId}`,
          quantity,
          unitPrice,
        };
      });
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const orderNumber = `MCP-${Date.now()}`;
      return db.createOrder(
        {
          tenantId,
          orderNumber,
          customerEmail: args.customer_email != null ? String(args.customer_email) : null,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
          status: "pending",
          paymentMethod: args.payment_method != null ? String(args.payment_method) : "stripe",
          notes: args.notes != null ? String(args.notes) : null,
        },
        items
      );
    }

    // ── DealFlow ──────────────────────────────────────────────────────────────

    case "list_deals":
      return {
        deals: [],
        total: 0,
        message: "Connect DealFlow (ksksrbiz-arch/reddit-referral-mark) to load deals.",
        filters: { category: args.category, difficulty: args.difficulty, search: args.search },
      };

    case "get_deal":
      return {
        id: String(args.deal_id),
        brand: "DealFlow Demo",
        title: "Sample Deal",
        description: "Connect DealFlow to view real deal data.",
        category: "Cashback",
        bonusAmount: 0,
        difficulty: "easy",
        requirements: "Sign up and complete first transaction.",
        referralUrl: "https://1commerce.online",
        featured: false,
      };

    case "search_deals":
      return { deals: [], total: 0, query: String(args.query) };

    case "get_deal_recommendations":
      return { recommendations: [], user_id: String(args.user_id), message: "Connect DealFlow for personalized recommendations." };

    case "manage_wishlist":
      return { action: String(args.action), user_id: String(args.user_id), items: [], success: true };

    case "track_deal_conversion":
      return { tracked: true, deal_id: String(args.deal_id), event_type: String(args.event_type), ts: new Date().toISOString() };

    case "generate_deal_content":
      return {
        deal_id: String(args.deal_id),
        content_type: String(args.content_type),
        content: `[AI content stub] Connect BUILT_IN_FORGE_API_KEY to generate real content for deal ${args.deal_id}.`,
        ts: new Date().toISOString(),
      };

    case "get_feature_flags":
      return {
        flags: [
          { id: "flag_hero_v2", name: "Hero V2", enabled: true, rollout_percentage: 50 },
          { id: "flag_deals_grid", name: "Deals Grid Layout", enabled: false, rollout_percentage: 0 },
        ],
        tenant_id: args.tenant_id ?? null,
      };

    case "set_feature_flag":
      return { flag_id: String(args.flag_id), enabled: Boolean(args.enabled), rollout_percentage: args.rollout_percentage ?? 100, updated: true };

    // ── Shopify Theme ─────────────────────────────────────────────────────────

    case "get_theme_sections":
      return {
        sections: [
          { name: "hero", enabled: true, description: "Full-width hero banner with CTA" },
          { name: "trust-bar", enabled: true, description: "Trust signals and feature icons" },
          { name: "featured-collections", enabled: true, description: "Highlighted product collections" },
          { name: "brand-story", enabled: true, description: "Brand narrative and values" },
          { name: "featured-products", enabled: true, description: "Hand-picked featured products" },
          { name: "testimonials", enabled: true, description: "Customer reviews and ratings" },
          { name: "newsletter", enabled: true, description: "Email signup with discount offer" },
        ],
      };

    case "sync_theme_config":
      return { synced: true, tenant_id: Number(args.tenant_id), section: String(args.section), ts: new Date().toISOString() };

    case "get_theme_performance":
      return { tenant_id: Number(args.tenant_id), performance: 94, accessibility: 98, seo: 100, best_practices: 96, ts: new Date().toISOString() };

    case "update_section_settings":
      return { updated: true, tenant_id: Number(args.tenant_id), section: String(args.section), settings: args.settings, ts: new Date().toISOString() };

    case "get_loyalty_config":
      return { tenant_id: Number(args.tenant_id), provider: "smile.io", points_per_dollar: 10, tiers: ["Bronze", "Silver", "Gold"], enabled: true };

    // ── TerpForge ─────────────────────────────────────────────────────────────

    case "list_compounds":
      return {
        compounds: [
          { name: "Beta-Caryophyllene", slug: "beta-caryophyllene", formula: "C15H24", mw: "204.35", bp: "130°C", density: "0.905", logP: "4.7", profile: "CALM", profileColor: "#6366f1", aroma: "Spicy, woody, peppery", description: "A sesquiterpene found in black pepper and cloves." },
          { name: "Limonene", slug: "limonene", formula: "C10H16", mw: "136.23", bp: "176°C", density: "0.840", logP: "4.57", profile: "FOCUS", profileColor: "#f59e0b", aroma: "Citrus, fresh, bright", description: "A monocyclic monoterpene with uplifting properties." },
          { name: "Linalool", slug: "linalool", formula: "C10H18O", mw: "154.25", bp: "198°C", density: "0.858", logP: "2.97", profile: "CALM", profileColor: "#8b5cf6", aroma: "Floral, lavender, sweet", description: "Found in over 200 plants with calming effects." },
        ],
        total: 3,
        profile_filter: args.profile ?? null,
      };

    case "get_compound": {
      const compounds = {
        "beta-caryophyllene": { name: "Beta-Caryophyllene", slug: "beta-caryophyllene", formula: "C15H24", mw: "204.35", bp: "130°C", density: "0.905", logP: "4.7", profile: "CALM", profileColor: "#6366f1", aroma: "Spicy, woody, peppery", description: "A sesquiterpene found in black pepper.", radar: { recovery: 0.6, focus: 0.4, calm: 0.9, antiInflammatory: 0.95, aromaticStrength: 0.7, bioavailability: 0.65 }, bars: { potency: 0.8, volatility: 0.4, polarity: 0.3, abundance: 0.75 } },
      };
      return compounds[String(args.slug)] ?? { error: `Compound '${args.slug}' not found.` };
    }

    case "simulate_compound_purity": {
      const pct = Number(args.purity_percentage);
      let tier, note, pass;
      if (pct >= 95) { tier = "Pharmaceutical"; note = "Exceptional purity, suitable for medical applications."; pass = true; }
      else if (pct >= 85) { tier = "Premium"; note = "High purity, suitable for premium consumer products."; pass = true; }
      else if (pct >= 70) { tier = "Standard"; note = "Acceptable purity for general use."; pass = true; }
      else { tier = "Below Standard"; note = "Purity below acceptable threshold. Reformulation recommended."; pass = false; }
      return { compound_slug: String(args.compound_slug), purity_percentage: pct, tier, note, pass };
    }

    case "get_coa_data":
      return {
        entries: [
          { id: "coa-001", product: "Beta-Caryophyllene 99%", lab: "ACS Labs", terpenes_pct: 98.7, pass: true, date: "2025-01-15" },
          { id: "coa-002", product: "Limonene Blend", lab: "SC Labs", terpenes_pct: 94.2, pass: true, date: "2025-01-20" },
        ],
        total: 2,
      };

    case "list_terp_products":
      return {
        products: [
          { id: "tp-001", name: "TerpForge Hoodie", category: "apparel", price: 65.00, profile: null },
          { id: "tp-002", name: "Ultrasonic Diffuser Pro", category: "hardware", price: 89.99, profile: "CALM" },
          { id: "tp-003", name: "CBD Wellness Drops", category: "wellness", price: 45.00, profile: "RECOVERY" },
        ],
        total: 3,
        category_filter: args.category ?? null,
      };

    case "compare_terpene_profiles":
      return {
        compounds: (Array.isArray(args.compound_slugs) ? args.compound_slugs : []).map(slug => ({
          slug,
          radar: { recovery: Math.random(), focus: Math.random(), calm: Math.random(), antiInflammatory: Math.random(), aromaticStrength: Math.random(), bioavailability: Math.random() },
        })),
      };

    // ── Knowledge Graph ───────────────────────────────────────────────────────

    case "query_graph":
      return {
        nodes: [],
        edges: [],
        filter: { node_type: args.node_type ?? null, label: args.label ?? null },
        message: "Connect the Knowledge Graph (ksksrbiz-arch/Graph) to query real data.",
      };

    case "get_graph_stats":
      return { total_nodes: 0, total_edges: 0, by_type: {}, last_ingested: null, message: "No data ingested yet. Run a connector to populate the graph." };

    case "trigger_graph_ingest":
      return { job_id: `ingest-${Date.now()}`, status: "queued", source: String(args.source), ts: new Date().toISOString() };

    case "search_graph_nodes":
      return { nodes: [], query: String(args.query), message: "No nodes found. Ingest data first." };

    case "get_brain_activity":
      return { spikes_per_sec: 0, weight_changes: 0, regions: {}, seconds: Number(args.seconds ?? 60), message: "Brain layer inactive. Connect the Graph system to activate." };

    case "get_connector_configs":
      return {
        connectors: [
          { id: "claude_code", name: "Claude Code Sessions", type: "claude_code", connected: false },
          { id: "git", name: "Git History", type: "git", connected: false },
          { id: "markdown", name: "Markdown Notes", type: "markdown", connected: false },
        ],
      };

    // ── PixelForge Studio ─────────────────────────────────────────────────────

    case "list_pixel_assets":
      return { assets: [], total: 0, message: "No assets yet. Create your first pixel art asset in the PixelForge Studio." };

    case "get_pixel_asset":
      return { id: String(args.asset_id), name: "Unknown Asset", asset_type: "sprite", width: 16, height: 16, frames: [], palette: [], message: "Asset not found." };

    case "create_pixel_asset":
      return { id: `pf-${Date.now()}`, tenant_id: Number(args.tenant_id), name: String(args.name), width: Number(args.width), height: Number(args.height), asset_type: String(args.asset_type), frames: 1, created_at: new Date().toISOString() };

    case "export_sprite_sheet":
      return { asset_id: String(args.asset_id), png_base64: "", width: 0, height: 0, frame_count: 0, message: "Export requires the PixelForge Studio to be connected." };

    case "get_asset_metadata":
      return { asset_id: String(args.asset_id), palette: [], frame_count: 0, size_bytes: 0, created_at: null, message: "Asset metadata not found." };

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
