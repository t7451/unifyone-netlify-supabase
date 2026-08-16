import { ENV, getAppUrl } from "./env";
import {
  meterCredits,
  tokensToCredits,
  type CreditSource,
} from "../creditMeter";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /**
   * Optional credit metering context. When provided, the LLM call is
   * metered via server/creditMeter after completion using actual
   * token usage. Throws BEFORE the network request if the user has
   * insufficient credits AND no active subscription with overage.
   */
  meter?: {
    userId: string | number;
    source?: CreditSource;
    action: string;
    tenantId?: string | number;
    requestId?: string;
    /** Override automatic token→credit conversion */
    fixedCredits?: number;
    /** Multiplier applied to automatic token→credit conversion. */
    creditMultiplier?: number;
    /** Minimum credits charged for this request. */
    minimumCredits?: number;
    /** Additional audit metadata forwarded to creditMeter. */
    metadata?: Record<string, unknown>;
    /** Await metering and attach the result to the InvokeResult. */
    awaitResult?: boolean;
  };
  /** Override the default model. */
  model?: string;
  /** Ordered fallback chain: tried left-to-right when a model fails with a retryable error. */
  modelChain?: string[];
  /**
   * Bring-your-own-key: a user-supplied OpenRouter API key. When set, the
   * request is always routed to OpenRouter and authenticated with this key
   * instead of the platform key.
   */
  providerApiKey?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metering?: {
    estimatedCredits: number;
    chargedCredits?: number;
    balanceAfter?: number;
    overageCredits?: number;
    eventId?: string | null;
    success?: boolean;
    error?: string;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveProviderUrl = (
  baseUrl: string | undefined,
  defaultBaseUrl: string,
  path: string
) => {
  const root = baseUrl && baseUrl.trim().length > 0 ? baseUrl : defaultBaseUrl;
  return `${root.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

const resolveApiUrl = () =>
  resolveProviderUrl(
    ENV.forgeApiUrl,
    "https://forge.butterfly-effect.dev",
    "v1/chat/completions"
  );

const resolveOpenRouterApiUrl = () =>
  resolveProviderUrl(
    ENV.openRouterApiUrl,
    "https://openrouter.ai/api",
    "v1/chat/completions"
  );

const resolveGroqApiUrl = () =>
  resolveProviderUrl(
    ENV.groqApiUrl,
    "https://api.groq.com",
    "openai/v1/chat/completions"
  );

// Google AI Studio OpenAI-compatible endpoint (free tier with GEMINI_API_KEY).
// https://ai.google.dev/gemini-api/docs/openai
const resolveGeminiApiUrl = () =>
  resolveProviderUrl(
    ENV.geminiApiUrl,
    "https://generativelanguage.googleapis.com",
    "v1beta/openai/chat/completions"
  );

const resolveVercelAiGatewayApiUrl = () =>
  resolveProviderUrl(
    ENV.vercelAiGatewayApiUrl,
    "https://ai-gateway.vercel.sh/v1",
    "chat/completions"
  );

export const OPENROUTER_DEFAULT_MODEL =
  "nousresearch/hermes-3-llama-3.1-405b:free";

const isOpenRouterEnabled = () => (ENV.openRouterApiKey ?? "").length > 0;

// Premium catalog/gateway model ids map to their real (paid) OpenRouter
// slugs so paying users get the model they selected. Anything not mapped
// and not explicitly "openrouter/"-prefixed collapses onto the configured
// default model (the free tier).
const OPENROUTER_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "claude-3-5-haiku": "anthropic/claude-3.5-haiku",
  "claude-3-5-sonnet": "anthropic/claude-3.5-sonnet",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "llama-3.3-70b-versatile": "meta-llama/llama-3.3-70b-instruct",
};

const toOpenRouterModel = (model: string) => {
  if (model.startsWith("openrouter/")) return model.slice("openrouter/".length);
  if (OPENROUTER_MODEL_MAP[model]) return OPENROUTER_MODEL_MAP[model];
  return (ENV.openRouterModel ?? "").trim() || OPENROUTER_DEFAULT_MODEL;
};

export const GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile";
export const GEMINI_FALLBACK_MODEL = "gemini-2.0-flash";
export const VERCEL_AI_GATEWAY_FALLBACK_MODEL = "openai/gpt-5.5";

// Explicit free-tier chains used by high-volume tools (RoutePulse, briefs)
// so we burn Groq + Gemini free quota before paid OpenRouter/Forge paths.
export const FREE_TIER_FALLBACK_CHAIN = [
  `groq/${GROQ_FALLBACK_MODEL}`,
  `gemini/${GEMINI_FALLBACK_MODEL}`,
  "openrouter/google/gemini-2.0-flash-exp:free",
  "openrouter/nousresearch/hermes-3-llama-3.1-405b:free",
  "openrouter/openai/gpt-oss-20b:free",
] as const;

/**
 * Build a model chain that tries free Groq + Gemini first, then any
 * preferred/catalog models. Used by Kai chat (free tier) and high-volume
 * platform tools so we burn free quota before metered paths.
 */
export function freeFirstChain(...preferred: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of [...FREE_TIER_FALLBACK_CHAIN, ...preferred]) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

// The allowlist uses the concrete fallback model; "groq/<model>" is reserved
// for explicit Groq model routing without exposing arbitrary providers.
const isGroqModel = (model: string) =>
  model === GROQ_FALLBACK_MODEL || model.startsWith("groq/");

const isGeminiNativeModel = (model: string) =>
  model === GEMINI_FALLBACK_MODEL ||
  model.startsWith("gemini/") ||
  // Bare Gemini ids when native key is configured — prefer direct Google
  // free tier over routing them through OpenRouter/Forge.
  (/^gemini-[\w.-]+$/i.test(model) && (ENV.geminiApiKey ?? "").length > 0);

const isVercelAiGatewayModel = (model: string) => {
  if (isGroqModel(model) || isGeminiNativeModel(model)) return false;
  return /^[a-z0-9_-]+\/[a-z0-9._:-]+$/i.test(model);
};

const toProviderModel = (model: string) => {
  if (model.startsWith("groq/")) return model.slice("groq/".length);
  if (model.startsWith("gemini/")) return model.slice("gemini/".length);
  return model;
};

const assertApiKey = (
  provider: "forge" | "groq" | "gemini" | "vercelAiGateway" | "openRouter"
) => {
  if (provider === "openRouter") {
    if (!ENV.openRouterApiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured. Set this environment variable to enable AI features."
      );
    }
    return;
  }

  if (provider === "vercelAiGateway") {
    if (!ENV.vercelOidcToken) {
      throw new Error(
        "VERCEL_OIDC_TOKEN is not configured. Run `vc env pull .env.local` to enable Vercel AI Gateway fallback."
      );
    }
    return;
  }

  if (provider === "groq") {
    if (!ENV.groqApiKey) {
      throw new Error(
        "GROQ_API_KEY is not configured. Set this environment variable to enable Groq AI fallback."
      );
    }
    return;
  }

  if (provider === "gemini") {
    if (!ENV.geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Set this environment variable (Google AI Studio) to enable native Gemini free-tier routing."
      );
    }
    return;
  }

  if (!ENV.forgeApiKey) {
    throw new Error(
      "BUILT_IN_FORGE_API_KEY is not configured. Set this environment variable to enable AI features."
    );
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export const DEFAULT_MODEL = "gemini-2.5-flash";
export const DEFAULT_FALLBACK_CHAIN = [
  // Free-first: burn Groq + Gemini free quota before paid paths.
  `groq/${GROQ_FALLBACK_MODEL}`,
  `gemini/${GEMINI_FALLBACK_MODEL}`,
  DEFAULT_MODEL,
  "claude-3-5-haiku",
  "gpt-4o-mini",
  VERCEL_AI_GATEWAY_FALLBACK_MODEL,
  GROQ_FALLBACK_MODEL,
];

const FORGE_THINKING_MODELS = new Set(["gemini-2.5-flash", "gemini-2.5-pro"]);
// 4096 balances useful response length with broad OpenAI-compatible provider
// limits; callers that need long-form output can still opt in with
// maxTokens/max_tokens.
const DEFAULT_MAX_TOKENS = 4096;

const RETRYABLE_400_ERROR_CODES = new Set([
  "invalid_model",
  "model_not_found",
  "unsupported_model",
  "unsupported_parameter",
  "unknown_parameter",
]);

const RETRYABLE_400_PATTERNS = [
  "invalid model",
  "model not found",
  "does not exist",
  "unsupported model",
  "unsupported parameter",
  "max_tokens",
  "maximum context",
  "maximum output",
  "too many tokens",
  "unrecognized",
  "unknown parameter",
];

class LLMInvokeError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly responseText: string
  ) {
    super(`LLM invoke failed: ${status} ${statusText} – ${responseText}`);
  }
}

const hasRetryableCompatibilityPattern = (message: string) =>
  RETRYABLE_400_PATTERNS.some(pattern => message.includes(pattern));

/**
 * Normalize provider error payloads for retry decisions.
 *
 * OpenAI-compatible providers usually return
 * `{ error: { code, type, message } }`; Forge-compatible errors can also be
 * plain text. The returned `code` supports exact allowlist checks, while
 * `text` combines normalized code/type/message content for last-resort
 * compatibility pattern matching.
 */
const parseProviderErrorDetails = (responseText: string) => {
  try {
    const parsed = JSON.parse(responseText) as {
      error?: { code?: unknown; type?: unknown; message?: unknown };
    };
    const error = parsed.error;
    if (!error) return { text: responseText.toLowerCase() };
    const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
    const type = typeof error.type === "string" ? error.type.toLowerCase() : "";
    const message =
      typeof error.message === "string" ? error.message.toLowerCase() : "";
    return { code, text: `${code} ${type} ${message}` };
  } catch {
    return { text: responseText.toLowerCase() };
  }
};

function isRetryableError(err: unknown): boolean {
  if (err instanceof LLMInvokeError) {
    if (err.status === 401 || err.status === 403) return false;
    if (err.status === 429 || err.status >= 500) return true;
    if (err.status === 400) {
      const providerError = parseProviderErrorDetails(err.responseText);
      if (
        providerError.code &&
        RETRYABLE_400_ERROR_CODES.has(providerError.code)
      ) {
        return true;
      }
      const details = `${err.statusText} ${providerError.text}`.toLowerCase();
      return (
        details.includes("rate") || hasRetryableCompatibilityPattern(details)
      );
    }
    return false;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("invalid_api_key")
    )
      return false;
    if (msg.includes("400") && !msg.includes("rate")) {
      return hasRetryableCompatibilityPattern(msg);
    }
    if (
      msg.includes("5") ||
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("rate") ||
      msg.includes("fetch failed") ||
      msg.includes("network")
    ) {
      return true;
    }
  }
  return true;
}

async function invokeOnce(
  model: string,
  params: InvokeParams
): Promise<InvokeResult> {
  // Explicit free-tier providers (groq/*, gemini/*) bypass the OpenRouter
  // takeover so high-volume tools can burn free Groq + Gemini quota first.
  // A user-supplied BYOK key still forces OpenRouter. Bare models without a
  // free-provider prefix continue to prefer OpenRouter when configured.
  const byokKey = params.providerApiKey?.trim() || undefined;
  const provider: "forge" | "groq" | "gemini" | "vercelAiGateway" | "openRouter" =
    byokKey
      ? "openRouter"
      : isGroqModel(model) && (ENV.groqApiKey ?? "").length > 0
        ? "groq"
        : isGeminiNativeModel(model) && (ENV.geminiApiKey ?? "").length > 0
          ? "gemini"
          : isOpenRouterEnabled()
            ? "openRouter"
            : isVercelAiGatewayModel(model)
              ? "vercelAiGateway"
              : "forge";
  if (!byokKey) assertApiKey(provider);
  const providerModel =
    provider === "openRouter"
      ? toOpenRouterModel(model)
      : provider === "groq" || provider === "gemini"
        ? toProviderModel(model)
        : model;

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: providerModel,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens =
    params.maxTokens ?? params.max_tokens ?? DEFAULT_MAX_TOKENS;
  if (provider === "forge" && FORGE_THINKING_MODELS.has(providerModel)) {
    // The provider guard is intentional: a Groq-routed model such as
    // "groq/gemini-2.5-flash" is normalized to "gemini-2.5-flash", but Groq's
    // OpenAI-compatible API still must not receive Forge/Gemini-only params.
    // Forge supports Gemini's provider-specific thinking parameter; Groq's
    // OpenAI-compatible API and non-Gemini Forge models do not. Keep the budget
    // small so Gemini can plan without materially increasing latency or metered
    // token usage for short Kai chat requests.
    payload.thinking = { budget_tokens: 128 };
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(
    provider === "openRouter"
      ? resolveOpenRouterApiUrl()
      : provider === "groq"
        ? resolveGroqApiUrl()
        : provider === "gemini"
          ? resolveGeminiApiUrl()
          : provider === "vercelAiGateway"
            ? resolveVercelAiGatewayApiUrl()
            : resolveApiUrl(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${
          provider === "openRouter"
            ? (byokKey ?? ENV.openRouterApiKey)
            : provider === "groq"
              ? ENV.groqApiKey
              : provider === "gemini"
                ? ENV.geminiApiKey
                : provider === "vercelAiGateway"
                  ? ENV.vercelOidcToken
                  : ENV.forgeApiKey
        }`,
        // Optional OpenRouter attribution headers (https://openrouter.ai/docs).
        ...(provider === "openRouter"
          ? { "HTTP-Referer": getAppUrl(), "X-Title": "UnifyOne" }
          : {}),
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new LLMInvokeError(response.status, response.statusText, errorText);
  }

  const result = (await response.json()) as InvokeResult;

  if (params.meter) {
    const tokensIn = result.usage?.prompt_tokens ?? 0;
    const tokensOut = result.usage?.completion_tokens ?? 0;
    const tokenCredits = tokensToCredits(tokensIn, tokensOut);
    const amount =
      params.meter.fixedCredits ??
      Math.max(
        params.meter.minimumCredits ?? 0,
        Math.round(tokenCredits * (params.meter.creditMultiplier ?? 1) * 100) /
          100
      );
    const meterPayload = {
      userId: params.meter.userId,
      amount,
      source: params.meter.source ?? "ai_chat",
      action: params.meter.action,
      tokensIn,
      tokensOut,
      model: result.model || model,
      tenantId: params.meter.tenantId,
      requestId: params.meter.requestId,
      metadata: {
        finish_reason: result.choices[0]?.finish_reason ?? null,
        requested_model: model,
        credit_multiplier: params.meter.creditMultiplier ?? 1,
        minimum_credits: params.meter.minimumCredits ?? 0,
        ...(params.meter.metadata ?? {}),
      },
    };
    if (amount <= 0) {
      // Free-tier and BYOK requests are never metered — record a zero-charge
      // result so callers still get consistent metering metadata.
      result.metering = {
        estimatedCredits: 0,
        chargedCredits: 0,
        success: true,
      };
      return result;
    }
    result.metering = { estimatedCredits: amount };
    const meteringPromise = meterCredits(meterPayload);
    if (params.meter.awaitResult) {
      const metering = await meteringPromise;
      result.metering = {
        estimatedCredits: amount,
        chargedCredits: amount,
        balanceAfter: metering.balanceAfter,
        overageCredits: metering.overageCredits,
        eventId: metering.eventId,
        success: metering.success,
        error: metering.error,
      };
    } else {
      meteringPromise.catch(err =>
        console.error("[LLM] Credit metering failed:", err.message)
      );
    }
  }

  return result;
}

export async function invokeLLMWithFallback(
  params: InvokeParams
): Promise<InvokeResult> {
  const requested = params.model ?? DEFAULT_MODEL;
  const chain = params.modelChain ?? DEFAULT_FALLBACK_CHAIN;
  const ordered = [requested, ...chain.filter(m => m !== requested)];

  let lastError: unknown = null;
  for (let i = 0; i < ordered.length; i++) {
    const model = ordered[i];
    try {
      return await invokeOnce(model, params);
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!isRetryableError(err) || i === ordered.length - 1) {
        throw err;
      }
      const next = ordered[i + 1];
      console.warn(
        `[LLM] Model fallback: ${model} -> ${next} reason="${errMsg.slice(0, 200)}"`
      );
    }
  }
  throw (
    lastError ?? new Error("LLM invocation failed across all fallback models")
  );
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  return invokeLLMWithFallback(params);
}
