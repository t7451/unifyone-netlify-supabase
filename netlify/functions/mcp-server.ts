/**
 * Netlify Functions — MCP (Model Context Protocol) Server
 *
 * Exposes UnifyOne platform capabilities as MCP tools via a serverless
 * Express endpoint. Clients connect at /mcp using the Streamable HTTP transport.
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
import { meterCredits, CREDIT_COST_MODEL } from "../../server/creditMeter";

// Per-request context extracted from headers (set by the MCP client)
// X-UnifyOne-User-Id / X-UnifyOne-Tenant-Id — optional, used for
// attribution and credit metering.
function extractMcpContext(req: Request) {
  return {
    userId: (req.headers["x-unifyone-user-id"] as string) || null,
    tenantId: (req.headers["x-unifyone-tenant-id"] as string) || null,
    requestId:
      (req.headers["x-request-id"] as string) ||
      (req.headers["x-unifyone-request-id"] as string) ||
      null,
  };
}

/**
 * Wrap an MCP tool handler so every call is metered against the
 * caller's credit balance. If the user has no credits and no active
 * subscription with overage, the tool returns an error payload.
 */
function meteredTool<TArgs>(
  toolName: string,
  handler: (args: TArgs) => Promise<any>,
  getCtx: () => { userId: string | null; tenantId: string | null; requestId: string | null }
) {
  return async (args: TArgs) => {
    const { userId, tenantId, requestId } = getCtx();
    if (userId) {
      const result = await meterCredits({
        userId,
        tenantId: tenantId ?? undefined,
        amount: CREDIT_COST_MODEL.mcp_tool,
        source: "mcp_tool",
        action: `mcp:${toolName}`,
        requestId: requestId ?? undefined,
        metadata: { args },
      });
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: "insufficient_credits",
                  message: result.error ?? "Insufficient credits for this tool call",
                  balance_after: result.balanceAfter,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
    return handler(args);
  };
}

// ---------------------------------------------------------------------------
// Helper: create a fresh MCP server instance per request (stateless)
// ---------------------------------------------------------------------------
function createMcpServer(
  getCtx: () => { userId: string | null; tenantId: string | null; requestId: string | null }
): McpServer {
  const server = new McpServer({
    name: "UnifyOne MCP Server",
    version: "1.0.0",
  });

  // --- Tools ---------------------------------------------------------------

  server.tool(
    "get-platform-status",
    "Check the health and status of the UnifyOne platform",
    {},
    meteredTool("get-platform-status", async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "ok",
                version: "1.9.0",
                services: {
                  api: "running",
                  database: "connected",
                  integrations: "active",
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }, getCtx),
  );

  server.tool(
    "list-integrations",
    "List available third-party integrations on the UnifyOne platform",
    {},
    meteredTool("list-integrations", async () => {
      const integrations = [
        { name: "Stripe", category: "payments", status: "active" },
        { name: "PayPal", category: "payments", status: "active" },
        { name: "Square", category: "payments", status: "active" },
        { name: "Shopify", category: "ecommerce", status: "active" },
        { name: "Meta / Facebook", category: "social", status: "active" },
        { name: "Resend", category: "email", status: "active" },
        { name: "Supabase", category: "auth & database", status: "active" },
        { name: "AWS S3", category: "storage", status: "active" },
      ];
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(integrations, null, 2) },
        ],
      };
    }, getCtx),
  );

  server.tool(
    "search-products",
    "Search products in the UnifyOne catalog",
    { query: z.string().describe("Search term for products") },
    meteredTool<{ query: string }>("search-products", async ({ query }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query,
                note: "Connect this tool to your database for live results.",
                example: [
                  { id: 1, name: `Sample result for "${query}"`, price: 29.99 },
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    }, getCtx),
  );

  server.tool(
    "get-analytics-summary",
    "Retrieve a high-level analytics summary for the tenant",
    {
      period: z
        .enum(["day", "week", "month", "year"])
        .describe("Time period for the summary"),
    },
    meteredTool<{ period: "day" | "week" | "month" | "year" }>("get-analytics-summary", async ({ period }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period,
                note: "Connect this tool to your analytics service for live data.",
                example: {
                  revenue: 12450.0,
                  orders: 187,
                  newCustomers: 34,
                  conversionRate: "3.2%",
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }, getCtx),
  );

  server.tool(
    "manage-notifications",
    "Send or list notifications for a tenant user",
    {
      action: z.enum(["list", "send"]).describe("Action to perform"),
      message: z
        .string()
        .optional()
        .describe("Notification message (required for send)"),
      userId: z.string().optional().describe("Target user ID (required for send)"),
    },
    meteredTool<{ action: "list" | "send"; message?: string; userId?: string }>("manage-notifications", async ({ action, message, userId }) => {
      if (action === "send") {
        if (!message || !userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Both 'message' and 'userId' are required when action is 'send'.",
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { sent: true, userId, message, timestamp: new Date().toISOString() },
                null,
                2,
              ),
            },
          ],
        };
      }
      // action === "list"
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                notifications: [
                  {
                    id: 1,
                    message: "Welcome to UnifyOne!",
                    read: true,
                    createdAt: "2026-04-01T10:00:00Z",
                  },
                  {
                    id: 2,
                    message: "Your integration is live.",
                    read: false,
                    createdAt: "2026-04-03T14:30:00Z",
                  },
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    }, getCtx),
  );

  // --- Resources -----------------------------------------------------------

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
  const mcpCtx = extractMcpContext(req);
  const server = createMcpServer(() => mcpCtx);
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
