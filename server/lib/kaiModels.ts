import {
  GROQ_FALLBACK_MODEL,
  VERCEL_AI_GATEWAY_FALLBACK_MODEL,
} from "../_core/llm";

export const KAI_MODEL_IDS = [
  // ── Free tier (OpenRouter :free models — zero credits, available to all) ──
  "hermes-3-405b",
  "gpt-oss-120b",
  "gpt-oss-20b",
  "qwen3-coder-480b",
  "qwen3-next-80b",
  "nemotron-nano-9b",
  "venice-uncensored",
  // ── Premium tier (credit-metered) ──
  "gemini-2.5-flash",
  "claude-3-5-haiku",
  "gpt-4o-mini",
  "gemini-2.5-pro",
  "claude-3-5-sonnet",
  "gpt-4o",
  "kai-fast",
  "kai-balanced",
  "kai-premium",
] as const;

export type KaiModelId = (typeof KAI_MODEL_IDS)[number];

export type KaiModelProvider =
  | "google"
  | "anthropic"
  | "openai"
  | "nous"
  | "qwen"
  | "nvidia"
  | "venice";

export type KaiModelTier = "free" | "premium";

export interface KaiModelCatalogEntry {
  id: KaiModelId;
  label: string;
  provider: KaiModelProvider;
  tier: KaiModelTier;
  gatewayModel: string;
  description: string;
  creditMultiplier: number;
  minimumCredits: number;
  fallbackModels: string[];
}

// Explicit "openrouter/<slug>" ids route to that exact OpenRouter model
// (see server/_core/llm.ts). Free models never charge credits.
const FREE_GATEWAY = {
  hermes: "openrouter/nousresearch/hermes-3-llama-3.1-405b:free",
  gptOss120b: "openrouter/openai/gpt-oss-120b:free",
  gptOss20b: "openrouter/openai/gpt-oss-20b:free",
  qwen3Coder: "openrouter/qwen/qwen3-coder:free",
  qwen3Next: "openrouter/qwen/qwen3-next-80b-a3b-instruct:free",
  nemotron: "openrouter/nvidia/nemotron-nano-9b-v2:free",
  venice:
    "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
} as const;

// Free models fall back across other free models only, so a rate-limited
// :free endpoint can never silently roll a user onto a metered model.
const FREE_FALLBACK_MODELS = [
  FREE_GATEWAY.hermes,
  FREE_GATEWAY.gptOss120b,
  FREE_GATEWAY.qwen3Next,
  FREE_GATEWAY.gptOss20b,
  FREE_GATEWAY.nemotron,
];

const DEFAULT_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "claude-3-5-haiku",
  "gpt-4o-mini",
  VERCEL_AI_GATEWAY_FALLBACK_MODEL,
  GROQ_FALLBACK_MODEL,
];

const freeModel = (
  id: KaiModelId,
  label: string,
  provider: KaiModelProvider,
  gatewayModel: string,
  description: string
): KaiModelCatalogEntry => ({
  id,
  label,
  provider,
  tier: "free",
  gatewayModel,
  description,
  creditMultiplier: 0,
  minimumCredits: 0,
  fallbackModels: [
    gatewayModel,
    ...FREE_FALLBACK_MODELS.filter(m => m !== gatewayModel),
  ],
});

export const KAI_MODEL_CATALOG: Record<KaiModelId, KaiModelCatalogEntry> = {
  "hermes-3-405b": freeModel(
    "hermes-3-405b",
    "Hermes 3 405B (Free)",
    "nous",
    FREE_GATEWAY.hermes,
    "Free flagship 405B model — the default Kai brain, great all-rounder."
  ),
  "gpt-oss-120b": freeModel(
    "gpt-oss-120b",
    "GPT-OSS 120B (Free)",
    "openai",
    FREE_GATEWAY.gptOss120b,
    "Free open-weight OpenAI MoE model for high-reasoning, agentic tasks."
  ),
  "gpt-oss-20b": freeModel(
    "gpt-oss-20b",
    "GPT-OSS 20B (Free)",
    "openai",
    FREE_GATEWAY.gptOss20b,
    "Free low-latency open-weight OpenAI model for quick questions."
  ),
  "qwen3-coder-480b": freeModel(
    "qwen3-coder-480b",
    "Qwen3 Coder 480B (Free)",
    "qwen",
    FREE_GATEWAY.qwen3Coder,
    "Free code-specialist MoE model — automations, APIs, and tool use."
  ),
  "qwen3-next-80b": freeModel(
    "qwen3-next-80b",
    "Qwen3 Next 80B (Free)",
    "qwen",
    FREE_GATEWAY.qwen3Next,
    "Free fast instruct model with strong long-context reasoning."
  ),
  "nemotron-nano-9b": freeModel(
    "nemotron-nano-9b",
    "Nemotron Nano 9B (Free)",
    "nvidia",
    FREE_GATEWAY.nemotron,
    "Free compact NVIDIA reasoning model — fastest free option."
  ),
  "venice-uncensored": freeModel(
    "venice-uncensored",
    "Venice Uncensored (Free)",
    "venice",
    FREE_GATEWAY.venice,
    "Free steerable instruct model with minimal default refusals."
  ),
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    tier: "premium",
    gatewayModel: "gemini-2.5-flash",
    description: "Fast premium model for everyday commerce questions.",
    creditMultiplier: 1,
    minimumCredits: 1,
    fallbackModels: DEFAULT_FALLBACK_MODELS,
  },
  "claude-3-5-haiku": {
    id: "claude-3-5-haiku",
    label: "Claude 3.5 Haiku",
    provider: "anthropic",
    tier: "premium",
    gatewayModel: "claude-3-5-haiku",
    description: "Low-latency Anthropic model for concise operational help.",
    creditMultiplier: 1.25,
    minimumCredits: 1.25,
    fallbackModels: ["claude-3-5-haiku", ...DEFAULT_FALLBACK_MODELS],
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    tier: "premium",
    gatewayModel: "gpt-4o-mini",
    description: "Efficient OpenAI model for short Kai conversations.",
    creditMultiplier: 1.1,
    minimumCredits: 1,
    fallbackModels: ["gpt-4o-mini", ...DEFAULT_FALLBACK_MODELS],
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    tier: "premium",
    gatewayModel: "gemini-2.5-pro",
    description: "Higher-reasoning Google model for complex analysis.",
    creditMultiplier: 3,
    minimumCredits: 3,
    fallbackModels: ["gemini-2.5-pro", ...DEFAULT_FALLBACK_MODELS],
  },
  "claude-3-5-sonnet": {
    id: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    tier: "premium",
    gatewayModel: "claude-3-5-sonnet",
    description: "Premium Anthropic model for deeper planning and synthesis.",
    creditMultiplier: 4,
    minimumCredits: 4,
    fallbackModels: ["claude-3-5-sonnet", ...DEFAULT_FALLBACK_MODELS],
  },
  "gpt-4o": {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    tier: "premium",
    gatewayModel: "gpt-4o",
    description: "Premium OpenAI model for complex store operations.",
    creditMultiplier: 3.5,
    minimumCredits: 3.5,
    fallbackModels: ["gpt-4o", ...DEFAULT_FALLBACK_MODELS],
  },
  "kai-fast": {
    id: "kai-fast",
    label: "Kai Fast",
    provider: "google",
    tier: "premium",
    gatewayModel: "gemini-2.5-flash",
    description: "Alias for the fastest supported premium model.",
    creditMultiplier: 1,
    minimumCredits: 1,
    fallbackModels: DEFAULT_FALLBACK_MODELS,
  },
  "kai-balanced": {
    id: "kai-balanced",
    label: "Kai Balanced",
    provider: "anthropic",
    tier: "premium",
    gatewayModel: "claude-3-5-haiku",
    description: "Alias for balanced quality and latency.",
    creditMultiplier: 1.25,
    minimumCredits: 1.25,
    fallbackModels: ["claude-3-5-haiku", ...DEFAULT_FALLBACK_MODELS],
  },
  "kai-premium": {
    id: "kai-premium",
    label: "Kai Premium",
    provider: "anthropic",
    tier: "premium",
    gatewayModel: "claude-3-5-sonnet",
    description: "Alias for premium reasoning when available.",
    creditMultiplier: 4,
    minimumCredits: 4,
    fallbackModels: [
      "claude-3-5-sonnet",
      "gemini-2.5-pro",
      ...DEFAULT_FALLBACK_MODELS,
    ],
  },
};

export const DEFAULT_KAI_MODEL_ID: KaiModelId = "hermes-3-405b";

export function isKaiModelId(value: string): value is KaiModelId {
  return (KAI_MODEL_IDS as readonly string[]).includes(value);
}

export function resolveKaiModel(requested?: KaiModelId): KaiModelCatalogEntry {
  return KAI_MODEL_CATALOG[requested ?? DEFAULT_KAI_MODEL_ID];
}

/** Free models never gate on or debit Kai credits. */
export function isFreeKaiModel(entry: KaiModelCatalogEntry): boolean {
  return entry.tier === "free";
}

export function buildKaiChatMeterMetadata(
  selectedModel: KaiModelCatalogEntry,
  requestedModel?: KaiModelId | null
) {
  return {
    kai_model_id: selectedModel.id,
    kai_model_label: selectedModel.label,
    requested_model: requestedModel ?? null,
  };
}

export function getKaiModelCatalogForClient() {
  return KAI_MODEL_IDS.map(id => {
    const entry = KAI_MODEL_CATALOG[id];
    return {
      id: entry.id,
      label: entry.label,
      provider: entry.provider,
      tier: entry.tier,
      description: entry.description,
      creditMultiplier: entry.creditMultiplier,
      minimumCredits: entry.minimumCredits,
    };
  });
}
