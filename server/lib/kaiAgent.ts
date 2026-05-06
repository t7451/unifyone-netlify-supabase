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
import type { CreditSource } from "../creditMeter";

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
  /** If true, expose MCP tools. Default true. */
  enableTools?: boolean;
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
  const tools = enableTools ? await loadKaiToolDefinitions() : [];
  const toolCallLog: RunKaiAgentResult["toolCalls"] = [];

  const messages: Message[] = [...input.messages];

  let finalContent = "";
  let iteration = 0;

  for (iteration = 1; iteration <= maxIterations; iteration++) {
    const response: InvokeResult = await invokeLLM({
      messages,
      ...(tools.length > 0 ? { tools, toolChoice: "auto" } : {}),
      meter: {
        userId: input.user.id,
        source: input.meterSource ?? "ai_chat",
        action: input.meterAction ?? `kai.agent.iter${iteration}`,
        tenantId: input.user.tenantId ?? undefined,
      },
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
  };
}
