/**
 * server/routers/developer.ts
 *
 * Developer Hub tRPC router — API keys, webhook logs, platform health,
 * and code snippet helpers for platform builders and integrators.
 *
 * All procedures require authentication (protectedProcedure).
 * Tenant-scoped data is always filtered by ctx.user.tenantId.
 */

import { createHash, randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createApiKey,
  getApiKeysByTenant,
  getWebhookEvents,
  revokeApiKey,
  getTenantById,
} from "../db";

function requireTenantId(tenantId: number | null | undefined): number {
  if (!tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active tenant. Complete store setup first.",
    });
  }
  return tenantId;
}

/** Generate a secure API key with a readable prefix. */
function generateApiKeyPair(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const random = randomBytes(32).toString("hex");
  const rawKey = `uo_live_${random}`;
  const keyPrefix = rawKey.slice(0, 16); // "uo_live_" + 8 hex chars
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, keyPrefix, keyHash };
}

export const developerRouter = router({
  // ── API Keys ────────────────────────────────────────────────────────────────

  /** List all active API keys for the current tenant (never returns raw key). */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    const keys = await getApiKeysByTenant(tenantId);
    return keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  }),

  /** Generate a new API key. Raw key is returned ONCE — store it safely. */
  generateApiKey: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).default(["read"]),
        expiresInDays: z.number().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      const { rawKey, keyPrefix, keyHash } = generateApiKeyPair();

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000)
        : undefined;

      await createApiKey({
        tenantId,
        userId: ctx.user.id,
        name: input.name,
        keyPrefix,
        keyHash,
        scopes: input.scopes,
        expiresAt,
      });

      return {
        rawKey, // only returned once
        keyPrefix,
        name: input.name,
        scopes: input.scopes,
        expiresAt,
        message:
          "Save this key — it will not be shown again.",
      };
    }),

  /** Revoke an API key by ID. */
  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      await revokeApiKey(input.id, tenantId);
      return { success: true };
    }),

  // ── Webhook Logs ────────────────────────────────────────────────────────────

  /** Retrieve recent webhook events for the current tenant. */
  webhookLogs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      const events = await getWebhookEvents(tenantId, input.limit);
      return events;
    }),

  // ── Platform Health ─────────────────────────────────────────────────────────

  /** Quick health check of all platform services from the server side. */
  health: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);

    const checks = {
      database: true, // if we got here, DB is reachable
      stripe: !!process.env.STRIPE_SECRET_KEY,
      paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      shopify: !!(tenant?.shopifyShopDomain && tenant?.shopifySyncEnabled),
      n8n: !!tenant?.n8nWebhookUrl,
      mcp: !!process.env.MCP_WORKER_URL,
    };

    const allHealthy = Object.values(checks).every(Boolean);

    return {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            subscriptionStatus: tenant.subscriptionStatus,
          }
        : null,
    };
  }),

  // ── Endpoint Reference ──────────────────────────────────────────────────────

  /**
   * Return a curated list of tRPC router namespaces and their key procedures
   * for use in the developer hub API explorer.
   */
  endpointReference: protectedProcedure.query(async () => {
    return {
      baseUrl: "/trpc",
      auth: "Session cookie (JWT) required on all protected routes",
      namespaces: [
        {
          name: "products",
          description: "Manage your storefront catalog",
          procedures: [
            { name: "products.list", type: "query", description: "List products with optional filters" },
            { name: "products.create", type: "mutation", description: "Create a new product" },
            { name: "products.update", type: "mutation", description: "Update a product" },
            { name: "products.delete", type: "mutation", description: "Soft-delete (archive) a product" },
          ],
        },
        {
          name: "orders",
          description: "Order lifecycle and fulfillment",
          procedures: [
            { name: "orders.list", type: "query", description: "List orders with status/date filters" },
            { name: "orders.get", type: "query", description: "Get a single order with line items" },
            { name: "orders.updateStatus", type: "mutation", description: "Update order status" },
          ],
        },
        {
          name: "integrations",
          description: "Connect Shopify, Stripe, n8n, and more",
          procedures: [
            { name: "integrations.status", type: "query", description: "Get status of all integrations" },
            { name: "integrations.shopifyConnect", type: "mutation", description: "Connect a Shopify store" },
            { name: "integrations.n8nUpdate", type: "mutation", description: "Set n8n webhook URL" },
            { name: "integrations.n8nTrigger", type: "mutation", description: "Trigger an n8n workflow" },
          ],
        },
        {
          name: "analytics",
          description: "Sales, traffic, and performance metrics",
          procedures: [
            { name: "analytics.summary", type: "query", description: "Revenue + order summary stats" },
            { name: "analytics.revenueByDay", type: "query", description: "Daily revenue time series" },
            { name: "analytics.topProducts", type: "query", description: "Best-selling products" },
          ],
        },
        {
          name: "mcp",
          description: "Model Context Protocol — AI tool integration",
          procedures: [
            { name: "mcp.health", type: "query", description: "MCP worker health check" },
            { name: "mcp.listTools", type: "query", description: "List all registered MCP tools" },
            { name: "mcp.callTool", type: "mutation", description: "Invoke an MCP tool by name" },
            { name: "mcp.config", type: "query", description: "Get Claude Desktop config snippet" },
          ],
        },
        {
          name: "automation",
          description: "n8n workflow automation",
          procedures: [
            { name: "automation.list", type: "query", description: "List automation workflows" },
            { name: "automation.trigger", type: "mutation", description: "Manually trigger a workflow" },
          ],
        },
        {
          name: "developer",
          description: "Developer tooling and platform management",
          procedures: [
            { name: "developer.listApiKeys", type: "query", description: "List tenant API keys" },
            { name: "developer.generateApiKey", type: "mutation", description: "Generate a new API key" },
            { name: "developer.revokeApiKey", type: "mutation", description: "Revoke an API key" },
            { name: "developer.webhookLogs", type: "query", description: "Recent webhook events" },
            { name: "developer.health", type: "query", description: "Platform health check" },
          ],
        },
      ],
    };
  }),

  // ── Code Snippets ────────────────────────────────────────────────────────────

  /** Return ready-to-use code snippets for common storefront integrations. */
  codeSnippets: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);
    const baseUrl = process.env.APP_URL ?? "https://app.1commerce.online";
    const tenantSlug = tenant?.slug ?? "your-store";

    return [
      {
        id: "trpc-client",
        title: "tRPC Client Setup",
        language: "typescript",
        description: "Connect to the UnifyOne tRPC API from any TypeScript project",
        code: `import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@unifyone/server";

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "${baseUrl}/trpc",
      headers: () => ({
        // Pass your session cookie or API key
        "x-api-key": process.env.UNIFYONE_API_KEY,
      }),
    }),
  ],
});

// List products
const products = await trpc.products.list.query({ limit: 20 });
console.log(products);`,
      },
      {
        id: "webhook-n8n",
        title: "n8n Webhook Receiver",
        language: "json",
        description: "n8n workflow node that receives UnifyOne events",
        code: `{
  "nodes": [
    {
      "name": "UnifyOne Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "parameters": {
        "path": "unifyone-events",
        "httpMethod": "POST",
        "responseMode": "onReceived"
      }
    }
  ],
  "webhookUrl": "${baseUrl}/api/n8n/webhook"
}`,
      },
      {
        id: "shopify-sync",
        title: "Shopify Product Sync",
        language: "typescript",
        description: "Trigger a Shopify product sync via tRPC",
        code: `// Trigger Shopify product sync
const result = await trpc.integrations.shopifySync.mutate();
console.log(result.message);

// Connect a new Shopify store
await trpc.integrations.shopifyConnect.mutate({
  shopDomain: "${tenantSlug}.myshopify.com",
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});`,
      },
      {
        id: "mcp-tool-call",
        title: "MCP Tool Call",
        language: "typescript",
        description: "Call any registered MCP tool to query platform data",
        code: `// Get analytics summary via MCP
const analytics = await trpc.mcp.callTool.mutate({
  tool: "getAnalyticsSummary",
  args: { tenantId: "${tenantSlug}" },
});

// List low-stock products
const lowStock = await trpc.mcp.callTool.mutate({
  tool: "getLowStockProducts",
  args: { threshold: 5 },
});

// Claude Desktop config (copy from MCP widget)
// Add to ~/.claude/claude_desktop_config.json`,
      },
      {
        id: "storefront-embed",
        title: "Storefront Embed (React)",
        language: "tsx",
        description: "Embed the UnifyOne checkout in any React app",
        code: `import { useState } from "react";

export function StorefrontCheckout({ productId }: { productId: number }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    const res = await fetch("${baseUrl}/trpc/integrations.stripeCreateCheckout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json: { planSlug: "pro", billingCycle: "monthly" } }),
    });
    const { result } = await res.json();
    if (result?.data?.url) window.location.href = result.data.url;
    setLoading(false);
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? "Redirecting…" : "Subscribe Now"}
    </button>
  );
}`,
      },
      {
        id: "webhook-verify",
        title: "Stripe Webhook Verification",
        language: "typescript",
        description: "Verify Stripe webhook signatures in your receiver",
        code: `import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"]!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send("Webhook signature verification failed");
  }

  switch (event.type) {
    case "checkout.session.completed":
      // Handle successful checkout
      break;
    case "customer.subscription.updated":
      // Handle subscription change
      break;
  }

  res.json({ received: true });
});`,
      },
    ];
  }),
});
