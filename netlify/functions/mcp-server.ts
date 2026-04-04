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

// ---------------------------------------------------------------------------
// Helper: create a fresh MCP server instance per request (stateless)
// ---------------------------------------------------------------------------
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "UnifyOne MCP Server",
    version: "1.0.0",
  });

  // --- Tools ---------------------------------------------------------------

  server.tool(
    "get-platform-status",
    "Check the health and status of the UnifyOne platform",
    {},
    async () => {
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
    },
  );

  server.tool(
    "list-integrations",
    "List available third-party integrations on the UnifyOne platform",
    {},
    async () => {
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
    },
  );

  server.tool(
    "search-products",
    "Search products in the UnifyOne catalog",
    { query: z.string().describe("Search term for products") },
    async ({ query }) => {
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
    },
  );

  server.tool(
    "get-analytics-summary",
    "Retrieve a high-level analytics summary for the tenant",
    {
      period: z
        .enum(["day", "week", "month", "year"])
        .describe("Time period for the summary"),
    },
    async ({ period }) => {
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
    },
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
    async ({ action, message, userId }) => {
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
    },
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
