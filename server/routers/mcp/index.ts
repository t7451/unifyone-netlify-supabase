/**
 * server/routers/mcp/index.ts
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
 *
 * Transport only: procedures + zod schemas live here; the tool dispatch and
 * credit metering live in mcp.service.ts.
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../_core/trpc";
import * as service from "./mcp.service";

export const mcpRouter = router({
  /**
   * Health check — publicly accessible for status widgets.
   */
  health: publicProcedure.query(async () => {
    return service.health();
  }),

  /**
   * List all registered tools with schemas.
   */
  listTools: protectedProcedure.query(async () => {
    return service.listTools();
  }),

  /**
   * MCP protocol initialize — returns server capabilities.
   */
  initialize: protectedProcedure.query(async () => {
    return service.initialize();
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
      return service.callTool(ctx.user, input);
    }),

  /**
   * Convenience: get platform analytics summary via MCP.
   */
  analytics: protectedProcedure.query(async ({ ctx }) => {
    return service.analytics(ctx.user);
  }),

  /**
   * Convenience: get low stock products via MCP.
   */
  lowStock: protectedProcedure
    .input(z.object({ threshold: z.number().optional().default(10) }))
    .query(async ({ ctx, input }) => {
      return service.lowStock(ctx.user, input.threshold);
    }),

  /**
   * Get Worker config info (URL, version, registered tools) for Settings UI.
   */
  config: protectedProcedure.query(async () => {
    return service.config();
  }),
});
