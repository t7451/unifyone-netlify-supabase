/**
 * server/routers/mcp.ts
 *
 * tRPC router exposing the Cloudflare MCP Worker to the UnifyOne frontend.
 *
 * All procedures are protected (require auth). Tool calls are metered
 * against the user's credit balance via creditMeter.
 *
 * Frontend usage:
 *   const health = trpc.mcp.health.useQuery();
 *   const tools  = trpc.mcp.listTools.useQuery();
 *   const result = trpc.mcp.callTool.useMutation();
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  mcpHealth,
  mcpListTools,
  mcpCallTool,
  mcpInitialize,
  MCP_WORKER_URL,
} from "../lib/mcpClient";
import { meterCredits } from "../creditMeter";

// Credit cost per MCP tool call (matches CREDIT_COST_MODEL in creditMeter)
const MCP_TOOL_CREDIT_COST = 1;

export const mcpRouter = router({
  /**
   * Health check — publicly accessible for status widgets.
   */
  health: publicProcedure.query(async () => {
    try {
      const result = await mcpHealth();
      return { ...result, workerUrl: MCP_WORKER_URL };
    } catch (e: any) {
      return {
        status: "error" as const,
        message: e.message,
        workerUrl: MCP_WORKER_URL,
      };
    }
  }),

  /**
   * List all 18 registered tools with schemas.
   */
  listTools: protectedProcedure.query(async () => {
    try {
      const tools = await mcpListTools();
      return { tools, count: tools.length, workerUrl: MCP_WORKER_URL };
    } catch (e: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `MCP tools/list failed: ${e.message}`,
      });
    }
  }),

  /**
   * MCP protocol initialize — returns server capabilities.
   */
  initialize: protectedProcedure.query(async () => {
    try {
      return await mcpInitialize();
    } catch (e: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `MCP initialize failed: ${e.message}`,
      });
    }
  }),

  /**
   * Call any registered MCP tool by name.
   * Metered: 1 credit per call.
   */
  callTool: protectedProcedure
    .input(
      z.object({
        tool: z.string().min(1).max(64),
        args: z.record(z.unknown()).default({}),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Meter the call
      try {
        const metered = await meterCredits({
          userId,
          tenantId: ctx.user.tenantId ?? undefined,
          amount: MCP_TOOL_CREDIT_COST,
          source: "mcp_tool",
          action: `mcp:${input.tool}`,
        });
        if (!metered.success) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient credits. Please top up to continue.",
          });
        }
      } catch (e: any) {
        if (e instanceof TRPCError) throw e;
        // If metering itself fails, still allow the call (don't block on billing infra)
        console.warn("[mcp.callTool] Metering failed (non-blocking):", e.message);
      }

      try {
        const result = await mcpCallTool(input.tool, input.args as Record<string, unknown>);
        return { success: true, tool: input.tool, result };
      } catch (e: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `MCP tool "${input.tool}" failed: ${e.message}`,
        });
      }
    }),

  /**
   * Convenience: get platform analytics summary via MCP.
   */
  analytics: protectedProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("getAnalyticsSummary", input.tenantId ? { tenantId: input.tenantId } : {});
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
      }
    }),

  /**
   * Convenience: get low stock products via MCP.
   */
  lowStock: protectedProcedure
    .input(z.object({ threshold: z.number().optional().default(10) }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("getLowStockProducts", { threshold: input.threshold });
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
      }
    }),

  /**
   * Get Worker config info (URL, version, registered tools) for Settings UI.
   */
  config: protectedProcedure.query(async () => {
    const tools = await mcpListTools().catch(() => []);
    return {
      workerUrl: MCP_WORKER_URL,
      endpoint: `${MCP_WORKER_URL}/mcp`,
      healthUrl: `${MCP_WORKER_URL}/health`,
      customDomain: "mcp.1commerce.online (pending DNS)",
      toolCount: tools.length,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
      claudeDesktopConfig: JSON.stringify(
        {
          mcpServers: {
            unify0ne: {
              url: `${MCP_WORKER_URL}/mcp`,
            },
          },
        },
        null,
        2
      ),
    };
  }),
});
