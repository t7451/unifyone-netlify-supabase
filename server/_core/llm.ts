import { ENV } from "./env";
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

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.butterfly-effect.dev/v1/chat/completions";

const resolveGroqApiUrl = () =>
  ENV.groqApiUrl && ENV.groqApiUrl.trim().length > 0
    ? `${ENV.groqApiUrl.replace(/\/$/, "")}/openai/v1/chat/completions`
    : "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile";

const isGroqModel = (model: string) =>
  model === GROQ_FALLBACK_MODEL || model.startsWith("groq/");

const toProviderModel = (model: string) =>
  model.startsWith("groq/") ? model.slice("groq/".length) : model;

const assertApiKey = (provider: "forge" | "groq") => {
  if (provider === "groq") {
    if (!ENV.groqApiKey) {
      throw new Error(
        "GROQ_API_KEY is not configured. Set this environment variable to enable Groq AI fallback."
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
  DEFAULT_MODEL,
  "claude-3-5-haiku",
  "gpt-4o-mini",
  GROQ_FALLBACK_MODEL,
];

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("invalid_api_key")
    )
      return false;
    if (msg.includes("400") && !msg.includes("rate")) {
      return (
        msg.includes("model") ||
        msg.includes("unsupported") ||
        msg.includes("unrecognized") ||
        msg.includes("unknown parameter")
      );
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
  const provider = isGroqModel(model) ? "groq" : "forge";
  assertApiKey(provider);
  const providerModel = toProviderModel(model);

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

  payload.max_tokens = params.maxTokens ?? params.max_tokens ?? 32768;
  if (provider === "forge" && providerModel.includes("gemini")) {
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
    provider === "groq" ? resolveGroqApiUrl() : resolveApiUrl(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${
          provider === "groq" ? ENV.groqApiKey : ENV.forgeApiKey
        }`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
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
