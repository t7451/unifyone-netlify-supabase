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
  normalizeMcpToolArguments,
  normalizeMcpToolName,
} from "../lib/mcpClient";
import { meterCredits } from "../creditMeter";

// Credit cost per MCP tool call (matches CREDIT_COST_MODEL in creditMeter)
const MCP_TOOL_CREDIT_COST = 1;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getAuthoritativeTenantId(
  tenantId: string | number | null | undefined
): string | number | null {
  return tenantId === null || tenantId === undefined ? null : tenantId;
}

export const mcpRouter = router({
  /**
   * Health check — publicly accessible for status widgets.
   */
  health: publicProcedure.query(async () => {
    try {
      const result = await mcpHealth();
      return { ...result, workerUrl: MCP_WORKER_URL };
    } catch (e: unknown) {
      return {
        status: "error" as const,
        message: getErrorMessage(e),
        workerUrl: MCP_WORKER_URL,
      };
    }
  }),

  /**
   * List all registered tools with schemas.
   */
  listTools: protectedProcedure.query(async () => {
    try {
      const tools = await mcpListTools();
      return { tools, count: tools.length, workerUrl: MCP_WORKER_URL };
    } catch (e: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `MCP tools/list failed: ${getErrorMessage(e)}`,
      });
    }
  }),

  /**
   * MCP protocol initialize — returns server capabilities.
   */
  initialize: protectedProcedure.query(async () => {
    try {
      return await mcpInitialize();
    } catch (e: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `MCP initialize failed: ${getErrorMessage(e)}`,
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
        args: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const requestedTool = input.tool;
      let toolName: string;
      try {
        toolName = normalizeMcpToolName(requestedTool);
      } catch (e: unknown) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: getErrorMessage(e),
        });
      }

      // Meter the call
      try {
        const metered = await meterCredits({
          userId,
          tenantId: ctx.user.tenantId ?? undefined,
          amount: MCP_TOOL_CREDIT_COST,
          source: "mcp_tool",
          action: `mcp:${toolName}`,
        });
        if (!metered.success) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient credits. Please top up to continue.",
          });
        }
      } catch (e: unknown) {
        if (e instanceof TRPCError) throw e;
        // If metering itself fails, still allow the call (don't block on billing infra)
        console.warn(
          "[mcp.callTool] Metering failed (non-blocking):",
          getErrorMessage(e)
        );
      }

      const safeArgs = normalizeMcpToolArguments(input.args, {
        authoritativeTenantId: getAuthoritativeTenantId(ctx.user.tenantId),
      });

      try {
        const result = await mcpCallTool(toolName, safeArgs);
        return {
          success: true,
          tool: requestedTool,
          resolvedTool: toolName,
          result,
        };
      } catch (e: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `MCP tool "${toolName}" failed: ${getErrorMessage(e)}`,
        });
      }
    }),

  /**
   * Convenience: get platform analytics summary via MCP.
   */
  analytics: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = getAuthoritativeTenantId(ctx.user.tenantId);
    try {
      return await mcpCallTool(
        "get_analytics_summary",
        normalizeMcpToolArguments({}, { authoritativeTenantId: tenantId })
      );
    } catch (e: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: getErrorMessage(e),
      });
    }
  }),

  /**
   * Convenience: get low stock products via MCP.
   */
  lowStock: protectedProcedure
    .input(z.object({ threshold: z.number().optional().default(10) }))
    .query(async ({ ctx, input }) => {
      const tenantId = getAuthoritativeTenantId(ctx.user.tenantId);
      try {
        return await mcpCallTool(
          "get_low_stock_products",
          normalizeMcpToolArguments(
            { threshold: input.threshold },
            { authoritativeTenantId: tenantId }
          )
        );
      } catch (e: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: getErrorMessage(e),
        });
      }
    }),

  /**
   * Get Worker config info (URL, version, registered tools) for Settings UI.
   */
  config: protectedProcedure.query(async () => {
    let toolListError: string | undefined;
    let tools: Awaited<ReturnType<typeof mcpListTools>> = [];
    try {
      tools = await mcpListTools();
    } catch (e: unknown) {
      toolListError = getErrorMessage(e);
    }

    return {
      workerUrl: MCP_WORKER_URL,
      endpoint: `${MCP_WORKER_URL}/mcp`,
      healthUrl: `${MCP_WORKER_URL}/health`,
      customDomain: "mcp.1commerce.online (pending DNS)",
      toolCount: tools.length,
      toolListError,
      tools: tools.map(t => ({ name: t.name, description: t.description })),
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
