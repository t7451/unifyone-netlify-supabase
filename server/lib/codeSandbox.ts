/**
 * server/lib/codeSandbox.ts
 *
 * In-platform code execution sandbox for Kai and the user Sandbox page.
 *
 * Code runs inside a QuickJS WebAssembly VM (quickjs-emscripten) — fully
 * isolated from the host: no filesystem, no network, no process/env access.
 * Hard limits: wall-clock deadline (interrupt handler), memory cap, capped
 * console output, capped tool calls.
 *
 * The asyncify build makes host async functions look SYNCHRONOUS inside the
 * VM, so sandbox code is plain JS without await:
 *
 *   const products = callTool("list_products", { limit: 10 });
 *   console.log(products.length);
 *   products.filter(p => p.stock < 5).map(p => p.name)   // ← final value
 *
 * Security invariant (same as kaiAgent): tenantId in tool args is ALWAYS
 * overwritten server-side with the authenticated user's tenant.
 */
import { newQuickJSAsyncWASMModuleFromVariant } from "quickjs-emscripten-core";
import variant from "@jitl/quickjs-singlefile-cjs-release-asyncify";
import { mcpCallTool } from "./mcpClient";
import { executeNativeTool, isNativeTool } from "./kaiNativeTools";

export interface SandboxUser {
  id: string | number;
  tenantId?: string | number | null;
}

export interface SandboxRunOptions {
  code: string;
  user: SandboxUser;
  /** JSON-serializable value exposed as the `input` global. */
  input?: unknown;
  timeoutMs?: number;
  memoryLimitBytes?: number;
  /** Allow `callTool()` access to platform MCP tools. Default true. */
  allowTools?: boolean;
  maxToolCalls?: number;
}

export interface SandboxToolCallLog {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string;
}

export interface SandboxRunResult {
  ok: boolean;
  /** JSON-serialized final expression value (when ok). */
  result?: unknown;
  error?: string;
  logs: string[];
  toolCalls: SandboxToolCallLog[];
  durationMs: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MEMORY_LIMIT = 64 * 1024 * 1024;
const DEFAULT_MAX_TOOL_CALLS = 20;
const MAX_LOG_LINES = 200;
const MAX_LOG_LINE_LENGTH = 2_000;
const MAX_RESULT_JSON_LENGTH = 100_000;

// The wasm module is heavyweight; load once per lambda instance. The runtime
// is also a singleton: quickjs-emscripten 0.32 crashes when disposing a
// runtime that ever hosted an asyncified function, so we keep one runtime
// alive and create/dispose a fresh CONTEXT per run (contexts dispose fine and
// provide the actual isolation between runs). Runs are serialized per
// instance because the interrupt handler and memory limit are runtime-level.
let modulePromise: ReturnType<
  typeof newQuickJSAsyncWASMModuleFromVariant
> | null = null;
function getModule() {
  if (!modulePromise) {
    modulePromise = newQuickJSAsyncWASMModuleFromVariant(variant);
  }
  return modulePromise;
}

type AsyncRuntime =
  Awaited<ReturnType<typeof getModule>> extends {
    newRuntime: () => infer R;
  }
    ? R
    : never;

let sharedRuntime: AsyncRuntime | null = null;
async function getRuntime(): Promise<AsyncRuntime> {
  if (!sharedRuntime) {
    const quickjs = await getModule();
    sharedRuntime = quickjs.newRuntime();
  }
  return sharedRuntime;
}

let runQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = runQueue.then(task, task);
  runQueue = next.catch(() => undefined);
  return next;
}

function formatLogValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function runSandboxedCode(
  options: SandboxRunOptions
): Promise<SandboxRunResult> {
  return enqueue(() => runSandboxedCodeInner(options));
}

async function runSandboxedCodeInner(
  options: SandboxRunOptions
): Promise<SandboxRunResult> {
  const startedAt = Date.now();
  const timeoutMs = Math.min(
    Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 100),
    20_000
  );
  const maxToolCalls = Math.min(
    Math.max(options.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS, 0),
    50
  );
  const allowTools = options.allowTools !== false;
  const logs: string[] = [];
  const toolCalls: SandboxToolCallLog[] = [];

  // Tenant isolation: resolve once, outside the VM, from the authed user.
  const userTenantId =
    options.user.tenantId !== null && options.user.tenantId !== undefined
      ? String(options.user.tenantId)
      : null;

  const runtime = await getRuntime();
  runtime.setMemoryLimit(options.memoryLimitBytes ?? DEFAULT_MEMORY_LIMIT);
  const deadline = Date.now() + timeoutMs;
  runtime.setInterruptHandler(() => Date.now() > deadline);
  const ctx = runtime.newContext();

  try {
    // ── console.* capture ──
    const pushLog = (level: string, parts: string[]) => {
      if (logs.length >= MAX_LOG_LINES) return;
      const line = `${level === "log" ? "" : `[${level}] `}${parts.join(" ")}`;
      logs.push(line.slice(0, MAX_LOG_LINE_LENGTH));
    };
    const consoleObj = ctx.newObject();
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      const fn = ctx.newFunction(level, (...handles) => {
        pushLog(
          level,
          handles.map(h => formatLogValue(ctx.dump(h)))
        );
        return ctx.undefined;
      });
      ctx.setProp(consoleObj, level, fn);
      fn.dispose();
    }
    ctx.setProp(ctx.global, "console", consoleObj);
    consoleObj.dispose();

    // ── input global ──
    const inputJson = JSON.stringify(options.input ?? null);
    const inputHandle = ctx.evalCode(`(${inputJson ?? "null"})`);
    if (inputHandle.error) {
      inputHandle.error.dispose();
      ctx.setProp(ctx.global, "input", ctx.null);
    } else {
      ctx.setProp(ctx.global, "input", inputHandle.value);
      inputHandle.value.dispose();
    }

    // ── callTool host bridge (asyncified → looks synchronous in the VM) ──
    if (allowTools) {
      const callTool = ctx.newAsyncifiedFunction(
        "callTool",
        async (nameHandle, argsHandle) => {
          const name = ctx.getString(nameHandle);
          let args: Record<string, unknown> = {};
          if (argsHandle) {
            const dumped = ctx.dump(argsHandle);
            if (dumped && typeof dumped === "object") {
              args = dumped as Record<string, unknown>;
            }
          }
          if (toolCalls.length >= maxToolCalls) {
            throw new Error(
              `Tool call limit reached (${maxToolCalls} per run)`
            );
          }
          // ── CRITICAL: never trust VM-provided tenantId ──
          const safeArgs = { ...args };
          if (userTenantId) {
            safeArgs.tenantId = userTenantId;
          } else {
            delete safeArgs.tenantId;
          }
          try {
            // Native app-layer tools first (web search, workspace fs, …);
            // everything else routes to the MCP worker.
            const result = isNativeTool(name)
              ? await executeNativeTool(name, safeArgs, {
                  user: options.user,
                })
              : await mcpCallTool(name, safeArgs);
            toolCalls.push({ name, args: safeArgs, ok: true });
            const json = JSON.stringify(result ?? null);
            const handle = ctx.evalCode(`(${json ?? "null"})`);
            if (handle.error) {
              handle.error.dispose();
              return ctx.null;
            }
            return handle.value;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            toolCalls.push({ name, args: safeArgs, ok: false, error: message });
            throw new Error(`callTool(${name}) failed: ${message}`);
          }
        }
      );
      ctx.setProp(ctx.global, "callTool", callTool);
      callTool.dispose();
    }

    // ── execute ──
    const evalResult = await ctx.evalCodeAsync(options.code, "sandbox.js");
    if (evalResult.error) {
      const dumped = ctx.dump(evalResult.error);
      evalResult.error.dispose();
      const message =
        dumped && typeof dumped === "object" && "message" in dumped
          ? `${(dumped as { name?: string }).name ?? "Error"}: ${(dumped as { message?: string }).message}`
          : formatLogValue(dumped);
      return {
        ok: false,
        error: message,
        logs,
        toolCalls,
        durationMs: Date.now() - startedAt,
      };
    }

    let result: unknown;
    try {
      const dumped = ctx.dump(evalResult.value);
      const json = JSON.stringify(dumped);
      result =
        json && json.length > MAX_RESULT_JSON_LENGTH
          ? `${json.slice(0, MAX_RESULT_JSON_LENGTH)}… (truncated)`
          : dumped;
    } catch {
      result = undefined;
    }
    evalResult.value.dispose();

    return {
      ok: true,
      result,
      logs,
      toolCalls,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      logs,
      toolCalls,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    runtime.removeInterruptHandler();
    // Per-run context disposal is the isolation boundary; the shared runtime
    // intentionally stays alive (see singleton note above).
    ctx.dispose();
  }
}
