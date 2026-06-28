import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../../lib/mcpClient";

/**
 * Use-case layer for the TerpForge router — wraps MCP tool dispatch scoped to
 * the caller's tenant. Transport (rate-limited procedures + zod) stays in
 * index.ts. Behaviour is identical to the original single-file router.
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

export async function callTerpTool(
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
