import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger.js";
import { loadBrandBrief } from "./prompts.js";

// Wrapper around the Anthropic SDK with two defaults baked in:
//
//   1. Brand brief is the cached system-prompt prefix. Every Spire call uses
//      the same brand brief, so we mark it with cache_control: ephemeral and
//      pay the ~1.25x write premium once per 5-minute window. Subsequent
//      calls in the same window read for ~0.1x. 20 articles × 3 calls per
//      article (expand-once, brief, write) = cache pays back almost immediately.
//
//   2. Adaptive thinking is the only supported `thinking` mode on Opus 4.7;
//      `budget_tokens` 400s on 4.7. We default to adaptive + effort:high,
//      which is what claude-api guidance recommends for intelligence-sensitive
//      work. Callers that need more headroom bump to xhigh or max.
//
// Model is injectable via the ANTHROPIC_MODEL / SPIRE_MODEL env variable so
// an account without Opus 4.7 access can fall back to Sonnet 4.6 (~40% the
// output cost) by setting SPIRE_MODEL=claude-sonnet-4-6.

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type CallOptions = {
  /** System prompt content that follows the brand brief (e.g. site-specific context). */
  systemExtra?: string;
  /** User message content. */
  user: string;
  /** Max output tokens. Always streams; timeouts are never a concern. */
  maxTokens: number;
  /** Default: "high". Use "xhigh" or "max" for hardest reasoning. */
  effort?: Effort;
  /** Default: true (adaptive thinking). Disable with `false` for short, mechanical calls. */
  think?: boolean;
  /** Override the default model. */
  model?: string;
  /** Optional structured-output schema. When set, Claude is forced to return valid JSON. */
  jsonSchema?: Record<string, unknown>;
};

export function createAnthropic(apiKey: string) {
  return new Anthropic({ apiKey });
}

export async function callClaude(
  client: Anthropic,
  model: string,
  opts: CallOptions
): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}> {
  const brandBrief = loadBrandBrief();
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text",
      text: brandBrief,
      // Cache the brand brief — it's identical across every Spire call, so
      // each additional call in a 5-minute window reads the cached prefix.
      cache_control: { type: "ephemeral" },
    },
  ];
  if (opts.systemExtra) {
    systemBlocks.push({ type: "text", text: opts.systemExtra });
  }

  // Cast — @anthropic-ai/sdk typings lag the API: `thinking.type: "adaptive"`
  // and `output_config.effort` are GA on Opus 4.7 / 4.6 / Sonnet 4.6 but the
  // compile-time types may still only expose the older "enabled"/"disabled"
  // variants. These fields are passed through to the wire protocol; older
  // models ignore `output_config` entirely. See shared/model-migration.md and
  // shared/prompt-caching.md in the claude-api skill for the authoritative
  // parameter shapes.
  const request = {
    model: opts.model ?? model,
    max_tokens: opts.maxTokens,
    stream: true,
    system: systemBlocks,
    messages: [{ role: "user", content: opts.user }],
    thinking:
      opts.think === false
        ? { type: "disabled" as const }
        : { type: "adaptive" as const },
    output_config: {
      effort: opts.effort ?? "high",
      ...(opts.jsonSchema
        ? { format: { type: "json_schema", schema: opts.jsonSchema } }
        : {}),
    },
  } as unknown as Anthropic.Messages.MessageCreateParamsStreaming;

  const stream = client.messages.stream(request);
  const finalMessage = await stream.finalMessage();

  let text = "";
  for (const block of finalMessage.content) {
    if (block.type === "text") text += block.text;
  }

  const usage = finalMessage.usage;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  logger.debug(
    {
      model: request.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
    },
    "Claude call complete"
  );

  if (finalMessage.stop_reason === "refusal") {
    throw new Error(
      "Claude returned stop_reason='refusal'. The prompt likely violated a safety policy. Review and revise."
    );
  }
  if (finalMessage.stop_reason === "max_tokens") {
    throw new Error(
      `Claude hit max_tokens (${opts.maxTokens}). Output truncated — raise maxTokens and retry.`
    );
  }

  return {
    text,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
  };
}
