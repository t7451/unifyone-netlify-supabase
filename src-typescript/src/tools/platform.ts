/**
 * src-typescript/src/tools/platform.ts
 *
 * MCP tool registrations — Spire tier (platform-wide and AI tools).
 *
 * Registered tools:
 *   • get_notifications  — latest platform notifications
 *   • get_platform_stats — aggregated cross-tenant statistics
 *   • ask_kai            — AI assistant powered by UnifyOne's Kai
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerPlatformTools(server: McpServer): void {
  server.tool(
    "get_notifications",
    "Platform-wide notifications, most recent first",
    { limit: z.number().int().positive().optional().default(20).describe("Max results") },
    async (args) => {
      const data = await apiFetch("get_notifications", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_platform_stats",
    "Aggregated cross-tenant platform statistics (tenant count, revenue totals, etc.)",
    {},
    async () => {
      const data = await apiFetch("get_platform_stats", {});
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "ask_kai",
    "Ask Kai, the UnifyOne AI assistant, a commerce-related question",
    {
      question: z.string().min(1).describe("The question to ask Kai"),
      context: z
        .record(z.unknown())
        .optional()
        .describe("Optional context — e.g. { tenant_id, page, recent_orders }"),
    },
    async (args) => {
      const data = await apiFetch("ask_kai", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
