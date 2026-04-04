/**
 * Netlify Functions — MCP (Model Context Protocol) Server
 *
 * Exposes UnifyOne platform capabilities as MCP tools via a serverless
 * Express endpoint. All tools query the live database through the existing
 * db.ts helpers. Clients connect at /mcp using the Streamable HTTP transport.
 *
 * Usage (MCP Inspector):
 *   npx @modelcontextprotocol/inspector npx mcp-remote@next https://<site>/mcp
 */
import "dotenv/config";
import express, { type Request, type Response } from "express";
import serverless from "serverless-http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { getDb } from "../../server/db";
import {
  getProducts,
  getProductById,
  getProductCount,
  getCategories,
  getOrders,
  getOrderWithItems,
  getOrderCount,
  getCustomers,
  getCustomerById,
  getCustomerCount,
  getAnalyticsSummary,
  getRevenueByDay,
  getTopProducts,
  getInventory,
  getLowStockProducts,
  getWebhookEvents,
  getAllTenants,
  getTenantById,
} from "../../server/db";

import { and, desc, eq } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// MCP Server factory (one per request — stateless)
// ---------------------------------------------------------------------------
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "UnifyOne MCP Server",
    version: "1.0.0",
  });

  // ── Platform Status ──────────────────────────────────────────────────────
  server.tool(
    "get-platform-status",
    "Check the health and status of the UnifyOne platform including database connectivity",
    {},
    async () => {
      const db = await getDb();
      const dbStatus = db ? "connected" : "unavailable";
      let tenantCount = 0;
      if (db) {
        const tenants = await getAllTenants();
        tenantCount = tenants.length;
      }
      return ok({
        status: db ? "ok" : "degraded",
        version: "1.9.0",
        services: {
          api: "running",
          database: dbStatus,
          integrations: "active",
        },
        tenantCount,
      });
    },
  );

  // ── List Tenants ─────────────────────────────────────────────────────────
  server.tool(
    "list-tenants",
    "List all tenants (businesses) on the platform",
    {},
    async () => {
      const tenants = await getAllTenants();
      return ok(
        tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          subscriptionStatus: t.subscriptionStatus,
          createdAt: t.createdAt,
        })),
      );
    },
  );

  // ── Get Tenant Details ───────────────────────────────────────────────────
  server.tool(
    "get-tenant",
    "Get detailed information about a specific tenant",
    { tenantId: z.number().describe("Tenant ID") },
    async ({ tenantId }) => {
      const tenant = await getTenantById(tenantId);
      if (!tenant) return err(`Tenant ${tenantId} not found`);
      return ok({
        ...tenant,
        // Redact sensitive tokens
        shopifyAccessToken: tenant.shopifyAccessToken ? "***" : null,
        squareAccessToken: tenant.squareAccessToken ? "***" : null,
      });
    },
  );

  // ── List Integrations ────────────────────────────────────────────────────
  server.tool(
    "list-integrations",
    "List integration status for a specific tenant",
    { tenantId: z.number().describe("Tenant ID") },
    async ({ tenantId }) => {
      const tenant = await getTenantById(tenantId);
      if (!tenant) return err(`Tenant ${tenantId} not found`);
      return ok([
        {
          name: "Stripe",
          category: "payments",
          connected: !!tenant.stripeCustomerId,
          subscriptionStatus: tenant.subscriptionStatus,
        },
        {
          name: "Shopify",
          category: "ecommerce",
          connected: !!tenant.shopifyShopDomain,
          shopDomain: tenant.shopifyShopDomain || null,
          syncEnabled: tenant.shopifySyncEnabled,
        },
        {
          name: "Square",
          category: "payments",
          connected: !!tenant.squareAccessToken,
        },
        {
          name: "PayPal",
          category: "payments",
          connected: true, // PayPal is platform-level
        },
        {
          name: "n8n",
          category: "automation",
          connected: !!tenant.n8nWebhookUrl,
        },
        {
          name: "Resend",
          category: "email",
          connected: true, // Platform-level
        },
        {
          name: "Supabase",
          category: "auth & database",
          connected: true, // Platform-level
        },
        {
          name: "AWS S3",
          category: "storage",
          connected: true, // Platform-level
        },
      ]);
    },
  );

  // ── Search Products ──────────────────────────────────────────────────────
  server.tool(
    "search-products",
    "Search products in a tenant's catalog by name, status, or category",
    {
      tenantId: z.number().describe("Tenant ID"),
      query: z.string().optional().describe("Search term (matches product name)"),
      status: z
        .enum(["active", "draft", "archived"])
        .optional()
        .describe("Filter by product status"),
      categoryId: z.number().optional().describe("Filter by category ID"),
      limit: z.number().optional().describe("Max results (default 50)"),
    },
    async ({ tenantId, query, status, categoryId, limit }) => {
      const results = await getProducts(tenantId, {
        search: query,
        status,
        categoryId,
        limit,
      });
      return ok({
        count: results.length,
        products: results.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          status: p.status,
          imageUrl: p.imageUrl,
          tags: p.tags,
          createdAt: p.createdAt,
        })),
      });
    },
  );

  // ── Get Product Details ──────────────────────────────────────────────────
  server.tool(
    "get-product",
    "Get full details for a specific product including inventory",
    {
      tenantId: z.number().describe("Tenant ID"),
      productId: z.number().describe("Product ID"),
    },
    async ({ tenantId, productId }) => {
      const product = await getProductById(productId, tenantId);
      if (!product) return err(`Product ${productId} not found`);
      const inv = await getInventory(tenantId, productId);
      return ok({ ...product, inventory: inv[0] || null });
    },
  );

  // ── List Categories ──────────────────────────────────────────────────────
  server.tool(
    "list-categories",
    "List product categories for a tenant",
    { tenantId: z.number().describe("Tenant ID") },
    async ({ tenantId }) => {
      return ok(await getCategories(tenantId));
    },
  );

  // ── Low Stock Alerts ─────────────────────────────────────────────────────
  server.tool(
    "get-low-stock",
    "Get products that are below their low-stock threshold",
    { tenantId: z.number().describe("Tenant ID") },
    async ({ tenantId }) => {
      const items = await getLowStockProducts(tenantId);
      return ok(
        items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          sku: i.product.sku,
          quantity: i.inv.quantity,
          threshold: i.inv.lowStockThreshold,
        })),
      );
    },
  );

  // ── List Orders ──────────────────────────────────────────────────────────
  server.tool(
    "list-orders",
    "List orders for a tenant with optional filtering",
    {
      tenantId: z.number().describe("Tenant ID"),
      status: z
        .enum([
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ])
        .optional()
        .describe("Filter by order status"),
      search: z.string().optional().describe("Search by order number"),
      limit: z.number().optional().describe("Max results (default 50)"),
    },
    async ({ tenantId, status, search, limit }) => {
      const results = await getOrders(tenantId, { status, search, limit });
      return ok({
        count: results.length,
        orders: results.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          total: o.total,
          currency: o.currency,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          createdAt: o.createdAt,
        })),
      });
    },
  );

  // ── Get Order Details ────────────────────────────────────────────────────
  server.tool(
    "get-order",
    "Get full order details including line items",
    {
      tenantId: z.number().describe("Tenant ID"),
      orderId: z.number().describe("Order ID"),
    },
    async ({ tenantId, orderId }) => {
      const order = await getOrderWithItems(orderId, tenantId);
      if (!order) return err(`Order ${orderId} not found`);
      return ok(order);
    },
  );

  // ── List Customers ───────────────────────────────────────────────────────
  server.tool(
    "list-customers",
    "List customers for a tenant",
    {
      tenantId: z.number().describe("Tenant ID"),
      search: z.string().optional().describe("Search by email"),
      limit: z.number().optional().describe("Max results (default 50)"),
    },
    async ({ tenantId, search, limit }) => {
      const results = await getCustomers(tenantId, { search, limit });
      return ok({
        count: results.length,
        customers: results.map((c) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          totalOrders: c.totalOrders,
          totalSpent: c.totalSpent,
          tags: c.tags,
          createdAt: c.createdAt,
        })),
      });
    },
  );

  // ── Get Customer Details ─────────────────────────────────────────────────
  server.tool(
    "get-customer",
    "Get detailed information about a specific customer",
    {
      tenantId: z.number().describe("Tenant ID"),
      customerId: z.number().describe("Customer ID"),
    },
    async ({ tenantId, customerId }) => {
      const customer = await getCustomerById(customerId, tenantId);
      if (!customer) return err(`Customer ${customerId} not found`);
      return ok(customer);
    },
  );

  // ── Analytics Summary ────────────────────────────────────────────────────
  server.tool(
    "get-analytics-summary",
    "Retrieve revenue, order, customer, and product counts for a tenant",
    {
      tenantId: z.number().describe("Tenant ID"),
      days: z
        .number()
        .optional()
        .describe("Lookback period in days (default 30)"),
    },
    async ({ tenantId, days }) => {
      const summary = await getAnalyticsSummary(tenantId, days ?? 30);
      if (!summary) return err("Database unavailable");
      return ok({ period: `${days ?? 30} days`, ...summary });
    },
  );

  // ── Revenue By Day ───────────────────────────────────────────────────────
  server.tool(
    "get-revenue-by-day",
    "Get daily revenue breakdown for a tenant",
    {
      tenantId: z.number().describe("Tenant ID"),
      days: z
        .number()
        .optional()
        .describe("Lookback period in days (default 30)"),
    },
    async ({ tenantId, days }) => {
      return ok(await getRevenueByDay(tenantId, days ?? 30));
    },
  );

  // ── Top Products ─────────────────────────────────────────────────────────
  server.tool(
    "get-top-products",
    "Get top-selling products by quantity for a tenant",
    {
      tenantId: z.number().describe("Tenant ID"),
      limit: z.number().optional().describe("Number of results (default 5)"),
    },
    async ({ tenantId, limit }) => {
      return ok(await getTopProducts(tenantId, limit ?? 5));
    },
  );

  // ── Notifications ────────────────────────────────────────────────────────
  server.tool(
    "list-notifications",
    "List notifications for a specific user",
    {
      userId: z.number().describe("User ID"),
      limit: z.number().optional().describe("Max results (default 20)"),
    },
    async ({ userId, limit }) => {
      const db = await getDb();
      if (!db) return err("Database unavailable");
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit ?? 20);
      const unread = rows.filter((n) => !n.read).length;
      return ok({ total: rows.length, unread, notifications: rows });
    },
  );

  server.tool(
    "send-notification",
    "Send a notification to a user",
    {
      userId: z.number().describe("Target user ID"),
      tenantId: z.number().optional().describe("Tenant ID"),
      type: z
        .enum([
          "info",
          "success",
          "warning",
          "error",
          "order",
          "payment",
          "team",
          "social",
          "lead",
        ])
        .optional()
        .describe("Notification type (default info)"),
      title: z.string().describe("Notification title"),
      body: z.string().optional().describe("Notification body text"),
      link: z.string().optional().describe("Optional link URL"),
    },
    async ({ userId, tenantId, type, title, body, link }) => {
      const db = await getDb();
      if (!db) return err("Database unavailable");
      await db.insert(notifications).values({
        userId,
        tenantId,
        type: type ?? "info",
        title,
        body,
        link,
      });
      return ok({ sent: true, userId, title, timestamp: new Date().toISOString() });
    },
  );

  // ── Webhook Events ───────────────────────────────────────────────────────
  server.tool(
    "list-webhook-events",
    "List recent webhook events (Stripe, Shopify, n8n, internal)",
    {
      tenantId: z.number().optional().describe("Filter by tenant ID"),
      limit: z.number().optional().describe("Max results (default 50)"),
    },
    async ({ tenantId, limit }) => {
      return ok(await getWebhookEvents(tenantId, limit ?? 50));
    },
  );

  // ── Resources ────────────────────────────────────────────────────────────

  server.resource("platform-info", "unifyone://info", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(
          {
            name: "UnifyOne",
            description:
              "All-in-one business platform — payments, e-commerce, social, analytics, and more.",
            version: "1.9.0",
            modules: [
              "Payments (Stripe, PayPal, Square)",
              "E-Commerce (Shopify)",
              "Social & Referrals",
              "Analytics & Revenue Streams",
              "Notifications & Email (Resend)",
              "Team & Governance",
              "AI Assistants",
            ],
            tools: [
              "get-platform-status",
              "list-tenants",
              "get-tenant",
              "list-integrations",
              "search-products",
              "get-product",
              "list-categories",
              "get-low-stock",
              "list-orders",
              "get-order",
              "list-customers",
              "get-customer",
              "get-analytics-summary",
              "get-revenue-by-day",
              "get-top-products",
              "list-notifications",
              "send-notification",
              "list-webhook-events",
            ],
          },
          null,
          2,
        ),
      },
    ],
  }));

  return server;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// Stateless Streamable-HTTP handler (one transport per request)
app.post("/mcp", async (req: Request, res: Response) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Handle GET & DELETE per MCP spec (return 405 for stateless server)
app.get("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST." },
    id: null,
  });
});

app.delete("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

export const handler = serverless(app);
