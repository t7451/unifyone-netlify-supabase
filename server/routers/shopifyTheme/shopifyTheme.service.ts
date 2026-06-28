import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../../lib/mcpClient";

/**
 * Use-case layer for the Shopify Theme router. Wraps the MCP tool dispatch so
 * the transport layer (index.ts) only deals with zod schemas and procedures.
 * Tenant isolation is preserved: every mcpCallTool() receives the caller's
 * authenticated tenant via authoritativeTenantId — behaviour is unchanged.
 */

export function requireTenantId(ctx: {
  user: { tenantId: number | null };
}): number {
  const tenantId = ctx.user.tenantId;
  if (tenantId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

/**
 * Dispatch an MCP tool call scoped to the caller's tenant, normalising any
 * thrown error into an INTERNAL_SERVER_ERROR — identical to the original
 * per-procedure try/catch.
 */
export async function callThemeTool(
  tenantId: number,
  tool: string,
  args: Record<string, unknown>
) {
  try {
    return await mcpCallTool(tool, args, { authoritativeTenantId: tenantId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
  }
}
