/**
 * server/lib/kaiAgent.ts
 *
 * Agentic loop for Kai. Exposes MCP tools to the LLM, executes any
 * tool calls the LLM emits, feeds results back, and iterates until
 * the LLM produces a terminal text response or maxIterations is hit.
 *
 * Critical security note: tool args sourced from the LLM are NEVER
 * trusted to provide a tenantId. We always inject ctx.user.tenantId
 * server-side before invoking the tool.
 */

import {
  invokeLLM,
  type Message,
  type Tool,
  type ToolCall,
  type InvokeResult,
} from "../_core/llm";
import { mcpListTools, mcpCallTool, type McpTool } from "./mcpClient";
import {
  executeNativeTool,
  isNativeTool,
  listNativeToolDefinitions,
} from "./kaiNativeTools";
import { runSandboxedCode } from "./codeSandbox";
import type { CreditSource } from "../creditMeter";

/**
 * Built-in code interpreter tool. Executes JS in the platform's QuickJS WASM
 * sandbox (see codeSandbox.ts) with the same tenant-scoped MCP tool access
 * as the rest of the agent loop.
 */
export const RUN_CODE_TOOL: Tool = {
  type: "function",
  function: {
    name: "run_code",
    description:
      "Execute JavaScript in a secure sandbox to compute, analyze, or transform data. " +
      "Inside the sandbox you can call platform tools synchronously via " +
      'callTool(name, args) — e.g. const orders = callTool("list_orders", { limit: 50 }). ' +
      "Use console.log for intermediate output; the final expression is returned as the result. " +
      "No network, filesystem, require/import, or await — plain synchronous JavaScript only.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript source to execute.",
        },
      },
      required: ["code"],
    },
  },
};

let _toolsCache: Tool[] | null = null;
let _toolsCacheLoadedAt = 0;
const TOOL_CACHE_TTL_MS = 5 * 60 * 1000;

/** Convert MCP tool descriptors to OpenAI-style function tools. */
function mcpToolToOpenAi(tool: McpTool): Tool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? `MCP tool: ${tool.name}`,
      parameters: (tool.inputSchema as Record<string, unknown>) ?? {
        type: "object",
        properties: {},
      },
    },
  };
}

export async function loadKaiToolDefinitions(force = false): Promise<Tool[]> {
  const now = Date.now();
  if (!force && _toolsCache && now - _toolsCacheLoadedAt < TOOL_CACHE_TTL_MS) {
    return _toolsCache;
  }
  try {
    const mcpTools = await mcpListTools();
    _toolsCache = mcpTools.map(mcpToolToOpenAi);
    _toolsCacheLoadedAt = now;
    return _toolsCache;
  } catch (e) {
    console.warn(
      "[KaiAgent] Failed to load MCP tools, agent will run tool-less:",
      e instanceof Error ? e.message : String(e)
    );
    return [];
  }
}

export interface RunKaiAgentInput {
  messages: Message[];
  /** Authenticated user context: forces tenant isolation. */
  user: { id: string | number; tenantId?: string | number | null };
  /** Max LLM<->tool round trips. Prevents infinite loops. */
  maxIterations?: number;
  /** Source for credit metering. Defaults to "ai_chat". */
  meterSource?: CreditSource;
  /** Action label used in metering and logs. */
  meterAction?: string;
  /** Gateway model selected by the Kai model allowlist. */
  model?: string;
  /** Ordered fallback models selected by the Kai model allowlist. */
  modelChain?: string[];
  /** Credit multiplier for this Kai model. */
  creditMultiplier?: number;
  /** Minimum credits charged per LLM iteration. */
  minimumCredits?: number;
  /** Additional metering metadata. */
  meterMetadata?: Record<string, unknown>;
  /** Await LLM metering and return usage details. */
  awaitMetering?: boolean;
  /** Optional base request id for per-iteration metering idempotency. */
  meterRequestId?: string;
  /** If true, expose MCP tools. Default true. */
  enableTools?: boolean;
  /** BYOK: user-supplied OpenRouter key forwarded to every LLM call. */
  providerApiKey?: string;
  /** Max completion tokens per LLM iteration. */
  maxTokens?: number;
}

export interface RunKaiAgentResult {
  finalContent: string;
  iterations: number;
  toolCalls: Array<{
    name: string;
    args: unknown;
    result?: unknown;
    error?: string;
  }>;
  fullMessages: Message[];
  modelUsage: Array<{
    requestedModel?: string;
    actualModel?: string;
    responseId?: string;
    estimatedCredits?: number;
    chargedCredits?: number;
    balanceAfter?: number;
    success?: boolean;
    error?: string;
  }>;
}

/**
 * Execute a single MCP tool call with mandatory tenant injection.
 */
async function executeToolCall(
  toolCall: ToolCall,
  user: RunKaiAgentInput["user"]
): Promise<{
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}> {
  const name = toolCall.function.name;
  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs =
      typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments || "{}")
        : (toolCall.function.arguments as Record<string, unknown>);
  } catch {
    parsedArgs = {};
  }

  // Built-in code interpreter: runs in the QuickJS WASM sandbox, which
  // enforces its own tenant injection for any callTool() it makes.
  if (name === RUN_CODE_TOOL.function.name) {
    const code = typeof parsedArgs.code === "string" ? parsedArgs.code : "";
    if (!code.trim()) {
      return { name, args: parsedArgs, error: "run_code requires code" };
    }
    const sandbox = await runSandboxedCode({ code, user });
    const summary = {
      ok: sandbox.ok,
      result: sandbox.result,
      logs: sandbox.logs,
      error: sandbox.error,
      toolCalls: sandbox.toolCalls.map(t => ({ name: t.name, ok: t.ok })),
      durationMs: sandbox.durationMs,
    };
    return sandbox.ok
      ? { name, args: { code }, result: summary }
      : { name, args: { code }, error: sandbox.error ?? "Sandbox error" };
  }

  // App-layer native tools (web search, page fetch, workspace fs, browser,
  // Linear, …). Tenant scoping for these is enforced inside the registry.
  if (isNativeTool(name)) {
    try {
      const result = await executeNativeTool(name, parsedArgs, { user });
      return { name, args: parsedArgs, result };
    } catch (e) {
      return {
        name,
        args: parsedArgs,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ── CRITICAL: never trust LLM-provided tenantId. Always inject server-side.
  const safeArgs = { ...parsedArgs };
  const userTenantId =
    user.tenantId !== null && user.tenantId !== undefined
      ? String(user.tenantId)
      : null;
  if (userTenantId) {
    safeArgs.tenantId = userTenantId;
  } else {
    delete safeArgs.tenantId;
  }

  try {
    const result = await mcpCallTool(name, safeArgs);
    return { name, args: safeArgs, result };
  } catch (e) {
    return {
      name,
      args: safeArgs,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function runKaiAgent(
  input: RunKaiAgentInput
): Promise<RunKaiAgentResult> {
  const maxIterations = Math.max(1, Math.min(10, input.maxIterations ?? 4));
  const enableTools = input.enableTools !== false;
  const tools = enableTools
    ? [
        ...(await loadKaiToolDefinitions()),
        ...listNativeToolDefinitions(),
        RUN_CODE_TOOL,
      ]
    : [];
  const toolCallLog: RunKaiAgentResult["toolCalls"] = [];
  const modelUsage: RunKaiAgentResult["modelUsage"] = [];

  const messages: Message[] = [...input.messages];

  let finalContent = "";
  let iteration = 0;

  for (iteration = 1; iteration <= maxIterations; iteration++) {
    const response: InvokeResult = await invokeLLM({
      messages,
      ...(tools.length > 0 ? { tools, toolChoice: "auto" } : {}),
      model: input.model,
      modelChain: input.modelChain,
      maxTokens: input.maxTokens,
      providerApiKey: input.providerApiKey,
      meter: {
        userId: input.user.id,
        source: input.meterSource ?? "ai_chat",
        action: input.meterAction ?? `kai.agent.iter${iteration}`,
        tenantId: input.user.tenantId ?? undefined,
        requestId: input.meterRequestId
          ? `${input.meterRequestId}:iter:${iteration}`
          : undefined,
        creditMultiplier: input.creditMultiplier,
        minimumCredits: input.minimumCredits,
        metadata: input.meterMetadata,
        awaitResult: input.awaitMetering,
      },
    });
    modelUsage.push({
      requestedModel: input.model,
      actualModel: response.model,
      responseId: response.id,
      estimatedCredits: response.metering?.estimatedCredits,
      chargedCredits: response.metering?.chargedCredits,
      balanceAfter: response.metering?.balanceAfter,
      success: response.metering?.success,
      error: response.metering?.error,
    });

    const choice = response.choices[0];
    if (!choice) break;

    const toolCalls = (
      choice.message as { tool_calls?: ToolCall[] } | undefined
    )?.tool_calls;
    const content =
      typeof choice.message?.content === "string" ? choice.message.content : "";

    if (toolCalls && toolCalls.length > 0) {
      // Append the assistant message announcing tool calls
      messages.push({
        role: "assistant",
        content: content || "",
      } as Message);

      for (const tc of toolCalls) {
        const exec = await executeToolCall(tc, input.user);
        toolCallLog.push({
          name: exec.name,
          args: exec.args,
          result: exec.result,
          error: exec.error,
        });
        // Feed result back as a tool message
        messages.push({
          role: "tool",
          name: exec.name,
          tool_call_id: tc.id,
          content: exec.error
            ? JSON.stringify({ error: exec.error })
            : typeof exec.result === "string"
              ? exec.result
              : JSON.stringify(exec.result ?? null),
        });
      }
      // Continue loop so the LLM can use tool results
      continue;
    }

    // No tool calls → terminal response
    finalContent = content || "";
    break;
  }

  if (!finalContent) {
    finalContent =
      "I gathered tool results but could not finalize a response. Please try rephrasing.";
  }

  return {
    finalContent,
    iterations: iteration,
    toolCalls: toolCallLog,
    fullMessages: messages,
    modelUsage,
  };
}
