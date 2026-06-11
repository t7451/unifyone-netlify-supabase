import { z } from "zod";
import { router, tenantProcedure } from "../_core/trpc";
import { runSandboxedCode } from "../lib/codeSandbox";
import { mcpListTools, MCP_TOOL_NAMES } from "../lib/mcpClient";

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
      if (!ctx.user) throw new Error("UNAUTHORIZED");
      const result = await runSandboxedCode({
        code: input.code,
        input: input.input,
        allowTools: input.allowTools,
        user: { id: ctx.user.id, tenantId: ctx.tenantId },
      });
      return { run: result };
    }),

  /**
   * Tools available to callTool() inside the sandbox. Always prefer the
   * LIVE worker list — the static allowlist can drift from what the MCP
   * worker actually serves.
   */
  listTools: tenantProcedure.query(async () => {
    try {
      const live = await mcpListTools();
      if (live.length > 0) {
        return {
          tools: live.map(t => t.name),
          source: "live" as const,
        };
      }
    } catch {
      // Worker unreachable — fall through to the static list.
    }
    return { tools: [...MCP_TOOL_NAMES], source: "static" as const };
  }),
});
