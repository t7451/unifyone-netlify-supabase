import { GROQ_FALLBACK_MODEL } from "../_core/llm";

export const KAI_MODEL_IDS = [
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

export type KaiModelProvider = "google" | "anthropic" | "openai";

export interface KaiModelCatalogEntry {
  id: KaiModelId;
  label: string;
  provider: KaiModelProvider;
  gatewayModel: string;
  description: string;
  creditMultiplier: number;
  minimumCredits: number;
  fallbackModels: string[];
}

const DEFAULT_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "claude-3-5-haiku",
  "gpt-4o-mini",
  GROQ_FALLBACK_MODEL,
];

export const KAI_MODEL_CATALOG: Record<KaiModelId, KaiModelCatalogEntry> = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    gatewayModel: "gemini-2.5-flash",
    description: "Default fast Kai model for everyday commerce questions.",
    creditMultiplier: 1,
    minimumCredits: 1,
    fallbackModels: DEFAULT_FALLBACK_MODELS,
  },
  "claude-3-5-haiku": {
    id: "claude-3-5-haiku",
    label: "Claude 3.5 Haiku",
    provider: "anthropic",
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
    gatewayModel: "gemini-2.5-flash",
    description: "Alias for the fastest supported Kai default.",
    creditMultiplier: 1,
    minimumCredits: 1,
    fallbackModels: DEFAULT_FALLBACK_MODELS,
  },
  "kai-balanced": {
    id: "kai-balanced",
    label: "Kai Balanced",
    provider: "anthropic",
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

export const DEFAULT_KAI_MODEL_ID: KaiModelId = "gemini-2.5-flash";

export function isKaiModelId(value: string): value is KaiModelId {
  return (KAI_MODEL_IDS as readonly string[]).includes(value);
}

export function resolveKaiModel(requested?: KaiModelId): KaiModelCatalogEntry {
  return KAI_MODEL_CATALOG[requested ?? DEFAULT_KAI_MODEL_ID];
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
      description: entry.description,
      creditMultiplier: entry.creditMultiplier,
      minimumCredits: entry.minimumCredits,
    };
  });
}
