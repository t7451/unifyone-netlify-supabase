import { TRPCError } from "@trpc/server";
import {
  mcpHealth,
  mcpListTools,
  mcpCallTool,
  mcpInitialize,
  MCP_WORKER_URL,
  normalizeMcpToolArguments,
  normalizeMcpToolName,
} from "../../lib/mcpClient";
import { meterCredits } from "../../creditMeter";

/**
 * Use-case layer for the MCP router. Holds tool dispatch + credit metering;
 * transport (zod, procedures) stays in index.ts. Behaviour and side-effect
 * order are identical to the original single-file router.
 */

// Credit cost per MCP tool call (matches CREDIT_COST_MODEL in creditMeter)
const MCP_TOOL_CREDIT_COST = 1;

export { MCP_WORKER_URL, mcpListTools };

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getAuthoritativeTenantId(
  tenantId: string | number | null | undefined
): string | number | null {
  return tenantId === null || tenantId === undefined ? null : tenantId;
}

export async function health() {
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
}

export async function listTools() {
  try {
    const tools = await mcpListTools();
    return { tools, count: tools.length, workerUrl: MCP_WORKER_URL };
  } catch (e: unknown) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `MCP tools/list failed: ${getErrorMessage(e)}`,
    });
  }
}

export async function initialize() {
  try {
    return await mcpInitialize();
  } catch (e: unknown) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `MCP initialize failed: ${getErrorMessage(e)}`,
    });
  }
}

export async function callTool(
  user: { id: number; tenantId: number | null },
  input: { tool: string; args: Record<string, unknown> }
) {
  const userId = user.id;
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
      tenantId: user.tenantId ?? undefined,
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
    authoritativeTenantId: getAuthoritativeTenantId(user.tenantId),
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
}

export async function analytics(user: { tenantId: number | null }) {
  const tenantId = getAuthoritativeTenantId(user.tenantId);
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
}

export async function lowStock(
  user: { tenantId: number | null },
  threshold: number
) {
  const tenantId = getAuthoritativeTenantId(user.tenantId);
  try {
    return await mcpCallTool(
      "get_low_stock_products",
      normalizeMcpToolArguments(
        { threshold },
        { authoritativeTenantId: tenantId }
      )
    );
  } catch (e: unknown) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: getErrorMessage(e),
    });
  }
}

export async function config() {
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
}
