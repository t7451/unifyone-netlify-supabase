import { z } from "zod";
import { router, tenantProcedure } from "../../_core/trpc";
import { run, listTools } from "./sandbox.service";

/**
 * Transport layer for the sandbox router. Procedures + zod schemas live here;
 * the QuickJS execution and tool discovery live in sandbox.service.ts.
 */
export const sandboxRouter = router({
  /** Execute user-authored JS in the platform QuickJS WASM sandbox. */
  run: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1).max(50_000),
        /** Optional JSON value exposed as the `input` global. */
        input: z.unknown().optional(),
        allowTools: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return run(
        ctx.user ? { id: ctx.user.id, tenantId: ctx.tenantId } : null,
        input
      );
    }),

  /**
   * Tools available to callTool() inside the sandbox. Always prefer the
   * LIVE worker list — the static allowlist can drift from what the MCP
   * worker actually serves.
   */
  listTools: tenantProcedure.query(async () => {
    return listTools();
  }),
});
