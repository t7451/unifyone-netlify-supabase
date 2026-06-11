import { z } from "zod";
import { router, tenantProcedure } from "../_core/trpc";
import { runSandboxedCode } from "../lib/codeSandbox";
import { MCP_TOOL_NAMES } from "../lib/mcpClient";

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

  /** Tool names available to callTool() inside the sandbox. */
  listTools: tenantProcedure.query(() => ({
    tools: [...MCP_TOOL_NAMES],
  })),
});
