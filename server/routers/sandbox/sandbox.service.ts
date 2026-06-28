import { runSandboxedCode } from "../../lib/codeSandbox";
import { mcpListTools, MCP_TOOL_NAMES } from "../../lib/mcpClient";
import { listNativeToolNames } from "../../lib/kaiNativeTools";

/**
 * Use-case layer for the sandbox router. Wraps the QuickJS WASM execution and
 * tool-name discovery so transport (index.ts) only holds zod + procedures.
 * Behaviour is identical to the original single-file router.
 */

interface RunArgs {
  code: string;
  input?: unknown;
  allowTools: boolean;
}

export async function run(
  user: { id: number; tenantId: number } | null,
  input: RunArgs
) {
  if (!user) throw new Error("UNAUTHORIZED");
  const result = await runSandboxedCode({
    code: input.code,
    input: input.input,
    allowTools: input.allowTools,
    user: { id: user.id, tenantId: user.tenantId },
  });
  return { run: result };
}

/**
 * Tools available to callTool() inside the sandbox. Always prefer the
 * LIVE worker list — the static allowlist can drift from what the MCP
 * worker actually serves.
 */
export async function listTools() {
  const native = listNativeToolNames();
  try {
    const live = await mcpListTools();
    if (live.length > 0) {
      return {
        tools: [...live.map(t => t.name), ...native],
        source: "live" as const,
      };
    }
  } catch {
    // Worker unreachable — fall through to the static list.
  }
  return {
    tools: [...MCP_TOOL_NAMES, ...native],
    source: "static" as const,
  };
}
